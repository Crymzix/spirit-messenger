/**
 * Video Call Overlay Component
 * Displays in-call UI for video calls within the chat window
 * Shows remote video, local video (picture-in-picture), call duration, and call controls
 */

import { useEffect, useState, useRef } from 'react';
import { useCallEnd } from '@/lib/hooks/call-hooks';
import { useCallStore } from '@/lib/store/call-store';
import { User } from '@/types';
import { webrtcService } from '@/lib/services/webrtc-service';

interface VideoCallOverlayProps {
    contact: User;
}

/**
 * Format seconds into MM:SS format
 */
function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get connection quality label based on ICE connection state
 */
function getConnectionQuality(iceConnectionState: string): {
    label: string;
    color: string;
} {
    switch (iceConnectionState) {
        case 'connected':
        case 'completed':
            return { label: 'Good', color: '#00AA00' };
        case 'checking':
        case 'new':
            return { label: 'Connecting...', color: '#FFA500' };
        case 'disconnected':
            return { label: 'Poor', color: '#FF6600' };
        case 'failed':
        case 'closed':
            return { label: 'Failed', color: '#FF0000' };
        default:
            return { label: 'Unknown', color: '#999999' };
    }
}

export function VideoCallOverlay({ contact }: VideoCallOverlayProps) {
    const [callDuration, setCallDuration] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Video element refs
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Call store state
    const activeCall = useCallStore((state) => state.activeCall);
    const callState = useCallStore((state) => state.callState);
    const localStream = useCallStore((state) => state.localStream);
    const remoteStream = useCallStore((state) => state.remoteStream);
    const isMuted = useCallStore((state) => state.isMuted);
    const isCameraOff = useCallStore((state) => state.isCameraOff);
    const iceConnectionState = useCallStore((state) => state.iceConnectionState);
    const toggleMute = useCallStore((state) => state.toggleMute);
    const toggleCamera = useCallStore((state) => state.toggleCamera);
    const endCallMutation = useCallEnd();

    // Set remote video stream when it changes
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Set local video stream when it changes
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Start timer when call becomes active
    useEffect(() => {
        if (callState === 'active' && !startTime) {
            setStartTime(Date.now());
        }
    }, [callState, startTime]);

    // Update call duration every second
    useEffect(() => {
        if (callState !== 'active' || !startTime) {
            return;
        }

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setCallDuration(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [callState, startTime]);

    // Handle hang up
    const handleHangUp = async () => {
        if (!activeCall) return;

        try {
            // End the call via API
            await endCallMutation.mutateAsync(activeCall.id);

            // Close peer connection and stop streams
            webrtcService.closePeerConnection();

            // Reset call store
            const callStore = useCallStore.getState();
            callStore.reset();
        } catch (error) {
            console.error('Failed to end call:', error);
        }
    };

    // Handle mute toggle
    const handleMuteToggle = () => {
        toggleMute();
    };

    // Handle camera toggle
    const handleCameraToggle = () => {
        toggleCamera();
    };

    // Get connection quality info
    const connectionQuality = getConnectionQuality(iceConnectionState);

    // Don't render if not in active or connecting state
    if (callState !== 'active' && callState !== 'connecting') {
        return null;
    }

    return (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-50 flex flex-col bg-black">
            {/* Remote Video - Full Screen */}
            <div className="relative flex-1 flex items-center justify-center bg-black">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                />

                {/* Connecting Overlay */}
                {callState === 'connecting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white font-verdana mb-2 animate-pulse">
                                Connecting...
                            </div>
                            <div className="text-lg text-white/80 font-verdana">
                                {contact.displayName || contact.username}
                            </div>
                        </div>
                    </div>
                )}

                {/* Local Video - Picture in Picture (Bottom Right) */}
                <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white shadow-2xl bg-black">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    {/* Camera Off Indicator */}
                    {isCameraOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <svg
                                className="w-12 h-12 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 3l18 18"
                                />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Top Info Bar */}
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
                    <div className="flex items-center justify-between">
                        {/* Contact Info */}
                        <div className="flex items-center gap-3">
                            <div className="text-white">
                                <div className="text-lg font-bold font-verdana">
                                    {contact.displayName || contact.username}
                                </div>
                                {contact.personalMessage && (
                                    <div className="text-sm text-white/80 font-verdana">
                                        {contact.personalMessage}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Call Duration & Connection Quality */}
                        <div className="flex items-center gap-4">
                            {/* Connection Quality */}
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: connectionQuality.color }}
                                />
                                <span className="text-sm font-verdana text-white">
                                    {connectionQuality.label}
                                </span>
                            </div>

                            {/* Call Duration */}
                            {callState === 'active' && (
                                <div className="text-xl font-bold font-verdana text-white">
                                    {formatDuration(callDuration)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Control Bar */}
            <div className="bg-gradient-to-t from-black/90 to-transparent p-6">
                <div className="flex items-center justify-center gap-4">
                    {/* Mute Button */}
                    <button
                        onClick={handleMuteToggle}
                        className={`
                            flex flex-col items-center justify-center
                            w-16 h-16 rounded-full
                            border-2 border-white/30
                            transition-all duration-200
                            hover:scale-110 hover:shadow-lg
                            ${isMuted
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-white/20 hover:bg-white/30'
                            }
                        `}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isMuted ? (
                                // Microphone off icon
                                <>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                    />
                                </>
                            ) : (
                                // Microphone on icon
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                            )}
                        </svg>
                    </button>

                    {/* Camera Toggle Button */}
                    <button
                        onClick={handleCameraToggle}
                        className={`
                            flex flex-col items-center justify-center
                            w-16 h-16 rounded-full
                            border-2 border-white/30
                            transition-all duration-200
                            hover:scale-110 hover:shadow-lg
                            ${isCameraOff
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-white/20 hover:bg-white/30'
                            }
                        `}
                        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isCameraOff ? (
                                // Camera off icon
                                <>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 3l18 18"
                                    />
                                </>
                            ) : (
                                // Camera on icon
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            )}
                        </svg>
                    </button>

                    {/* Hang Up Button */}
                    <button
                        onClick={handleHangUp}
                        className="
                            flex flex-col items-center justify-center
                            w-16 h-16 rounded-full
                            bg-red-600 hover:bg-red-700
                            border-2 border-white/30
                            transition-all duration-200
                            hover:scale-110 hover:shadow-lg
                        "
                        title="Hang Up"
                    >
                        <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                            />
                        </svg>
                    </button>
                </div>

                {/* Call Type Indicator */}
                <div className="text-center mt-4 text-sm text-white/60 font-verdana">
                    Video Call
                </div>
            </div>
        </div>
    );
}
