/**
 * Audio Call Overlay Component
 * Displays in-call UI for audio calls within the chat window
 * Shows call duration, contact info, call controls, and connection quality
 */

import { useEffect, useState } from 'react';
import { useCallEnd } from '@/lib/hooks/call-hooks';
import { useCallStore } from '@/lib/store/call-store';
import { User } from '@/types';
import Avatar from 'boring-avatars';
import { simplePeerService } from '@/lib/services/simple-peer-service';

interface AudioCallOverlayProps {
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

export function AudioCallOverlay({ contact }: AudioCallOverlayProps) {
    const [callDuration, setCallDuration] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);

    const activeCall = useCallStore((state) => state.activeCall);
    const callState = useCallStore((state) => state.callState);
    const isMuted = useCallStore((state) => state.isMuted);
    const iceConnectionState = useCallStore((state) => state.iceConnectionState);
    const toggleMute = useCallStore((state) => state.toggleMute);
    const endCallMutation = useCallEnd();

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
            simplePeerService.destroy();

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

    // Get connection quality info
    const connectionQuality = getConnectionQuality(iceConnectionState);

    // Don't render if not in active or connecting state
    if (callState !== 'active' && callState !== 'connecting') {
        return null;
    }

    return (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gradient-to-b from-[#c9d9f1] to-[#f6f6f6] border-2 border-[#31497C] rounded-lg shadow-2xl p-6 min-w-[400px]">
                {/* Contact Info */}
                <div className="flex flex-col items-center gap-4 mb-6">
                    {/* Display Picture */}
                    <div className="relative">
                        {contact.isAiBot ? (
                            <Avatar
                                name={contact.displayName || contact.username}
                                colors={['#0481f6', '#4edfb3', '#ff005b', '#ff7d10', '#ffb238']}
                                variant="marble"
                                square
                                className="size-[96px] rounded-lg border-2 border-[#586170]"
                            />
                        ) : (
                            <img
                                className="size-[96px] rounded-lg border-2 border-[#586170]"
                                src={contact.displayPictureUrl || '/default-profile-pictures/friendly_dog.png'}
                                alt={contact.displayName}
                            />
                        )}
                        {/* Pulse animation for active call */}
                        {callState === 'active' && (
                            <div className="absolute -inset-1 rounded-lg border-2 border-green-500 animate-pulse" />
                        )}
                    </div>

                    {/* Contact Name */}
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-[#31497C] font-verdana">
                            {contact.displayName || contact.username}
                        </h2>
                        {contact.personalMessage && (
                            <p className="text-sm text-gray-600 font-verdana mt-1">
                                {contact.personalMessage}
                            </p>
                        )}
                    </div>
                </div>

                {/* Call Status */}
                <div className="text-center mb-4">
                    {callState === 'connecting' ? (
                        <div className="text-lg font-verdana text-[#31497C] animate-pulse">
                            Connecting...
                        </div>
                    ) : (
                        <div className="text-2xl font-bold font-verdana text-[#31497C]">
                            {formatDuration(callDuration)}
                        </div>
                    )}
                </div>

                {/* Connection Quality Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: connectionQuality.color }}
                    />
                    <span className="text-sm font-verdana" style={{ color: connectionQuality.color }}>
                        {connectionQuality.label}
                    </span>
                </div>

                {/* Call Controls */}
                <div className="flex items-center justify-center gap-4">
                    {/* Mute Button */}
                    <button
                        onClick={handleMuteToggle}
                        className={`
                            flex flex-col items-center justify-center
                            w-20 h-20 rounded-full
                            border-2 border-[#31497C]
                            transition-all duration-200
                            hover:scale-110 hover:shadow-lg
                            ${isMuted
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-white hover:bg-gray-100'
                            }
                        `}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <svg
                            className={`w-8 h-8 ${isMuted ? 'text-white' : 'text-[#31497C]'}`}
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
                        <span className={`text-xs mt-1 font-verdana ${isMuted ? 'text-white' : 'text-[#31497C]'}`}>
                            {isMuted ? 'Unmute' : 'Mute'}
                        </span>
                    </button>

                    {/* Hang Up Button */}
                    <button
                        onClick={handleHangUp}
                        className="
                            flex flex-col items-center justify-center
                            w-20 h-20 rounded-full
                            bg-red-600 hover:bg-red-700
                            border-2 border-[#31497C]
                            transition-all duration-200
                            hover:scale-110 hover:shadow-lg
                        "
                        title="Hang Up"
                    >
                        <svg
                            className="w-8 h-8 text-white"
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
                        <span className="text-xs mt-1 text-white font-verdana">
                            Hang Up
                        </span>
                    </button>
                </div>

                {/* Call Type Indicator */}
                <div className="text-center mt-4 text-sm text-gray-600 font-verdana">
                    Voice Call
                </div>
            </div>
        </div>
    );
}
