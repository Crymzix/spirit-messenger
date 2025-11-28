import { useState } from 'react';
import { useCallAnswer, useCallDecline, useCallSignal } from './call-hooks';
import { useCallStore } from '../store/call-store';
import { webrtcService } from '../services/webrtc-service';
import { callRealtimeService } from '../services/call-realtime-service';
import { endCall } from '../services/call-service';
import {
    createConnectionStateHandler,
    handleRemoteStream,
    handleIceConnectionStateChange,
} from '../utils/webrtc-connection-handler';
import { supabase } from '../supabase';
import type { CallType } from '@/types';

interface UseIncomingCallHandlerProps {
    callId: string;
    callType: CallType;
    callerId: string;
    conversationId: string;
}

export function useIncomingCallHandler({
    callId,
    callType,
    callerId,
}: UseIncomingCallHandlerProps) {
    const answerMutation = useCallAnswer();
    const declineMutation = useCallDecline();
    const signalMutation = useCallSignal();
    const callStore = useCallStore();
    const [callError, setCallError] = useState<string | null>(null);

    const handleAnswer = async () => {
        try {
            // Step 1: Answer via backend API
            const call = await answerMutation.mutateAsync(callId);

            // Step 2: Update call store
            callStore.setActiveCall(call);
            callStore.setCallState('connecting');

            // Step 3: Get media permissions
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
            } catch (mediaError: any) {
                console.error('Media permission error:', mediaError);

                // Display error
                setCallError(mediaError.message || 'Failed to access microphone/camera');

                // Decline the call since we can't proceed without media
                try {
                    await declineMutation.mutateAsync(callId);
                } catch (declineError) {
                    console.error('Failed to decline call after media error:', declineError);
                }

                // Reset call store
                callStore.reset();

                // Error will remain displayed
                return;
            }

            // Step 4: Create peer connection
            console.log('Creating peer connection');
            webrtcService.createPeerConnection();

            // Step 5: Set up WebRTC event handlers with connection state management
            const { handler: connectionStateHandler, cleanup: cleanupConnectionHandler } =
                createConnectionStateHandler(
                    async () => {
                        // Callback when call should end due to connection failure
                        try {
                            await endCall(callId);
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

            // Step 6: Subscribe to signaling events via Realtime
            console.log('Subscribing to signaling events');

            // Get current user ID from auth
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            callRealtimeService.setCurrentUserId(user.id);

            await callRealtimeService.subscribeToSignaling(callId, {
                onSdpOffer: async (offer, fromUserId) => {
                    console.log('Received SDP offer from:', fromUserId);

                    try {
                        // Step 7: When sdp_offer received, set remote description and generate SDP answer
                        console.log('Creating SDP answer');
                        const answer = await webrtcService.createAnswer(offer);

                        // Step 8: Send SDP answer via useCallSignal hook
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
                        setCallError('Failed to establish connection');
                    }
                },
                onIceCandidate: async (_candidate, fromUserId) => {
                    console.log('Received ICE candidate from:', fromUserId);
                    // ICE candidates are automatically added by callRealtimeService
                },
            });

        } catch (error) {
            console.error('Failed to answer call:', error);
            setCallError('Failed to answer call. Please try again.');
        }
    };

    const handleDecline = async () => {
        await declineMutation.mutateAsync(callId);
    };

    return {
        handleAnswer,
        handleDecline,
        isAnswering: answerMutation.isPending,
        isDeclining: declineMutation.isPending,
        callError,
    };
}
