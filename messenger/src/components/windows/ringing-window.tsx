import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { moveWindow, Position } from "@tauri-apps/plugin-positioner";
import { platform } from "@tauri-apps/plugin-os";
import { useCallAnswer, useCallDecline, useCallMissed, useCallSignal } from "@/lib/hooks/call-hooks";
import { supabase } from "@/lib/supabase";
import { useCallStore } from "@/lib/store/call-store";
import { webrtcService } from "@/lib/services/webrtc-service";
import { callRealtimeService } from "@/lib/services/call-realtime-service";
import { endCall } from "@/lib/services/call-service";
import {
    createConnectionStateHandler,
    handleRemoteStream,
    handleIceConnectionStateChange
} from "@/lib/utils/webrtc-connection-handler";
import { CallErrorDialog } from "@/components/call-error-dialog";
import type { User, CallType } from "@/types";
import Avatar from "boring-avatars";

export function RingingWindow() {
    const params = new URLSearchParams(window.location.search);
    const callId = params.get('callId');
    const callType = params.get('callType') as CallType;
    const callerId = params.get('callerId');

    const [caller, setCaller] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [callError, setCallError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const answerMutation = useCallAnswer();
    const declineMutation = useCallDecline();
    const missedMutation = useCallMissed();
    const signalMutation = useCallSignal();
    const callStore = useCallStore();

    // Fetch caller information
    useEffect(() => {
        if (!callerId) {
            console.error('No caller ID provided');
            setIsLoading(false);
            return;
        }

        const fetchCaller = async () => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', callerId)
                    .single();

                if (error) {
                    console.error('Error fetching caller:', error);
                    return;
                }

                if (data) {
                    const userData = data as any;
                    setCaller({
                        id: userData.id,
                        email: userData.email,
                        username: userData.username,
                        displayName: userData.display_name,
                        personalMessage: userData.personal_message,
                        displayPictureUrl: userData.display_picture_url,
                        presenceStatus: userData.presence_status,
                        isAiBot: userData.is_ai_bot,
                        lastSeen: new Date(userData.last_seen),
                        createdAt: new Date(userData.created_at),
                        updatedAt: new Date(userData.updated_at),
                    });
                }
            } catch (err) {
                console.error('Error fetching caller:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCaller();
    }, [callerId]);

    // Position window and start ringing sound
    useEffect(() => {
        // Position window based on platform
        const positionWindow = async () => {
            try {
                const os = platform();
                const position = os === 'macos' ? Position.TopRight : Position.BottomRight;
                await moveWindow(position);
            } catch (error) {
                console.error('Failed to position ringing window:', error);
            }
        };
        positionWindow();

        // Start ringing sound
        const audio = new Audio('/sounds/video_call.mp3');
        audio.loop = true;
        audioRef.current = audio;

        // Play sound
        audio.play().catch((error) => {
            console.error('Failed to play ringing sound:', error);
        });

        // Cleanup: stop sound when component unmounts
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current = null;
            }
        };
    }, []);

    // Auto-decline after 30 seconds (mark as missed)
    useEffect(() => {
        if (!callId) {
            return;
        }

        // Set up 30-second timeout
        timeoutRef.current = setTimeout(async () => {
            console.log('Call timeout reached (30 seconds), marking as missed');

            try {
                // Stop ringing sound
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }

                // Mark call as missed
                await missedMutation.mutateAsync(callId);

                // Close the ringing window
                const appWindow = getCurrentWindow();
                await appWindow.close();
            } catch (error) {
                console.error('Failed to mark call as missed:', error);
                // Still close the window even if the API call fails
                const appWindow = getCurrentWindow();
                await appWindow.close();
            }
        }, 30000); // 30 seconds

        // Cleanup: clear timeout when component unmounts
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [callId, missedMutation]);

    // Cleanup WebRTC connection handler on unmount
    useEffect(() => {
        return () => {
            // Call cleanup function if it exists
            if ((window as any).__webrtcCleanup) {
                (window as any).__webrtcCleanup();
                (window as any).__webrtcCleanup = undefined;
            }
        };
    }, []);

    const handleAnswer = async () => {
        if (!callId || !callerId) {
            console.error('No call ID or caller ID provided');
            setError('Invalid call information');
            return;
        }

        try {
            // Clear the auto-decline timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Stop ringing sound
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            // Step 1: Answer the call via backend API
            console.log('Answering call:', callId);
            const call = await answerMutation.mutateAsync(callId);

            // Step 2: Update call store with activeCall and set callState to 'connecting'
            console.log('Updating call store with active call');
            callStore.setActiveCall(call);
            callStore.setCallState('connecting');

            // Step 3: Request media permissions using webrtc-service.getLocalStream
            console.log('Requesting media permissions');
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: callType === 'video' ? {
                    width: 640,
                    height: 480,
                    frameRate: 15,
                } : false,
            };

            let localStream: MediaStream;
            try {
                localStream = await webrtcService.getLocalStream(constraints);
                callStore.setLocalStream(localStream);
                console.log('Local stream obtained');
            } catch (mediaPermissionError: any) {
                console.error('Media permission error:', mediaPermissionError);

                // Display error in modal dialog
                setCallError(mediaPermissionError.message || 'Failed to access microphone/camera');

                // Decline the call since we can't proceed without media
                try {
                    await declineMutation.mutateAsync(callId);
                } catch (declineError) {
                    console.error('Failed to decline call after media error:', declineError);
                }

                // Reset call store
                callStore.reset();

                // Error dialog will remain open until user closes it
                // Window will close when user clicks OK on the error dialog
                return;
            }

            // Step 4: Create peer connection
            console.log('Creating peer connection');
            webrtcService.createPeerConnection();

            // Set up WebRTC event handlers with connection state management
            const { handler: connectionStateHandler, cleanup: cleanupConnectionHandler } =
                createConnectionStateHandler(
                    async () => {
                        // Callback when call should end due to connection failure
                        try {
                            await endCall(callId);
                            // Close the ringing window
                            const window = getCurrentWindow();
                            await window.close();
                        } catch (error) {
                            console.error('Error ending call:', error);
                        }
                    },
                    (errorMessage: string) => {
                        // Callback for displaying connection errors
                        setCallError(errorMessage);
                    }
                );

            webrtcService.setEventHandlers({
                onIceCandidate: (candidate) => {
                    console.log('Generated ICE candidate, sending to peer');
                    signalMutation.mutate({
                        callId,
                        signalType: 'ice-candidate',
                        signalData: candidate.toJSON(),
                        targetUserId: callerId,
                    });
                },
                onConnectionStateChange: connectionStateHandler,
                onIceConnectionStateChange: handleIceConnectionStateChange,
                onRemoteStream: handleRemoteStream,
            });

            // Store cleanup function for later use
            (window as any).__webrtcCleanup = cleanupConnectionHandler;

            // Step 5: Subscribe to sdp_offer event via Realtime
            console.log('Subscribing to signaling events');

            // Get current user ID from auth store or supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            callRealtimeService.setCurrentUserId(user.id);

            await callRealtimeService.subscribeToSignaling(callId, {
                onSdpOffer: async (offer, fromUserId) => {
                    console.log('Received SDP offer from:', fromUserId);

                    try {
                        // Step 6: When sdp_offer received, set remote description and generate SDP answer
                        // Note: setRemoteDescription is already called by callRealtimeService.handleSdpOffer
                        // We just need to create and send the answer
                        console.log('Creating SDP answer');
                        const answer = await webrtcService.createAnswer(offer);

                        // Step 7: Send SDP answer via useCallSignal hook
                        console.log('Sending SDP answer to caller');
                        await signalMutation.mutateAsync({
                            callId,
                            signalType: 'answer',
                            signalData: answer,
                            targetUserId: callerId,
                        });

                        console.log('Call answering flow complete, waiting for connection');
                    } catch (signalingError) {
                        console.error('Error during signaling:', signalingError);
                        setError('Failed to establish connection');
                    }
                },
                onIceCandidate: async (_candidate, fromUserId) => {
                    console.log('Received ICE candidate from:', fromUserId);
                    // ICE candidates are automatically added by callRealtimeService
                },
            });

            // Close the ringing window - the call UI will be shown in the chat window
            console.log('Closing ringing window');
            const appWindow = getCurrentWindow();
            appWindow.close();

        } catch (error) {
            console.error('Failed to answer call:', error);
            setError('Failed to answer call. Please try again.');

            // Show error for a moment before closing
            setTimeout(() => {
                const appWindow = getCurrentWindow();
                appWindow.close();
            }, 3000);
        }
    };

    const handleDecline = async () => {
        if (!callId) {
            console.error('No call ID provided');
            return;
        }

        try {
            // Clear the auto-decline timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Stop ringing sound
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            // Decline the call
            await declineMutation.mutateAsync(callId);

            // Close the ringing window
            const appWindow = getCurrentWindow();
            appWindow.close();
        } catch (error) {
            console.error('Failed to decline call:', error);
        }
    };

    const handleClose = () => {
        // Clear the auto-decline timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // Stop ringing sound
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Close window without answering or declining
        const appWindow = getCurrentWindow();
        appWindow.close();
    };

    if (isLoading) {
        return (
            <div
                className="w-screen h-screen flex items-center justify-center"
                style={{
                    background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                }}
            >
                <div className="text-[#31497C]">Loading...</div>
            </div>
        );
    }

    if (!caller) {
        return (
            <div
                className="w-screen h-screen flex items-center justify-center"
                style={{
                    background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                }}
            >
                <div className="text-[#31497C]">Caller not found</div>
            </div>
        );
    }

    return (
        <>
            <CallErrorDialog
                error={callError}
                onClose={async () => {
                    setCallError(null);
                    // Close the window after user acknowledges the error
                    const appWindow = getCurrentWindow();
                    await appWindow.close();
                }}
            />
            <div
                className="w-screen h-screen flex flex-col"
                style={{
                    background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                }}
            >
                <div className="flex flex-col flex-1 z-40 h-full">
                    {/* Title bar */}
                    <div
                        style={{
                            background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                        }}
                        className="flex justify-between w-full z-10 py-1 px-0.5"
                    >
                        <div className="flex items-center gap-1">
                            <img src='/msn.png' className="size-6" alt="MSN" />
                            <div
                                className="text-[#31497C] !text-sm"
                                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                            >
                                Incoming Call
                            </div>
                        </div>
                        <div
                            onClick={handleClose}
                            className="size-6 text-sm text-center font-bold text-white px-1 rounded bg-[#bf3128] border border-white flex items-center justify-center cursor-pointer"
                            title="Close"
                        >
                            ×
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 min-w-0 z-20 border-[0.5px] border-[#9A9FD0] m-0.5 px-0.5 overflow-hidden">
                        <div className="flex flex-col items-center gap-4 py-4 px-4">
                            {/* Caller display picture */}
                            <div className="relative">
                                {caller.displayPictureUrl ? (
                                    <img
                                        src={caller.displayPictureUrl}
                                        alt={caller.displayName}
                                        className="w-24 h-24 rounded-full object-cover border-2 border-[#31497C]"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full border-2 border-[#31497C] overflow-hidden">
                                        <Avatar
                                            size={96}
                                            name={caller.displayName}
                                            variant="beam"
                                            colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Caller name */}
                            <div className="text-lg font-bold text-[#31497C] text-center">
                                {caller.displayName}
                            </div>

                            {/* Call type */}
                            <div className="text-md text-[#31497C] text-center">
                                {callType === 'voice' ? 'Voice Call' : 'Video Call'}
                            </div>

                            {/* Ringing indicator or error message */}
                            {error ? (
                                <div className="text-sm text-red-600 text-center font-semibold">
                                    {error}
                                </div>
                            ) : (
                                <div className="text-sm text-[#31497C] text-center animate-pulse">
                                    Ringing...
                                </div>
                            )}

                            {/* Action buttons */}
                            {!error && (
                                <div className="flex gap-3 mt-2">
                                    <button
                                        onClick={handleAnswer}
                                        disabled={answerMutation.isPending}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {answerMutation.isPending ? 'Answering...' : 'Answer'}
                                    </button>
                                    <button
                                        onClick={handleDecline}
                                        disabled={declineMutation.isPending}
                                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {declineMutation.isPending ? 'Declining...' : 'Decline'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* MSN logo */}
                        <img src="/spirit-logo.png" alt="" className="ml-auto mt-auto h-6" />
                    </div>
                </div>
            </div>
        </>
    );
}
