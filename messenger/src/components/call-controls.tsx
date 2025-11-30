/**
 * Call Controls Component
 * Reusable call control buttons for voice and video calls
 * Provides mute, camera toggle (video only), and hang-up controls
 * Styled to match classic MSN Messenger aesthetic
 */

import { useCallEnd } from '@/lib/hooks/call-hooks';
import { useCallStore } from '@/lib/store/call-store';
import { simplePeerService } from '@/lib/services/simple-peer-service';

interface CallControlsProps {
    /** Whether this is a video call (shows camera toggle) */
    isVideoCall?: boolean;
    /** Optional custom styling for the container */
    className?: string;
    /** Variant for different visual styles */
    variant?: 'light' | 'dark';
}

/**
 * Call Controls Component
 * Displays mute, camera toggle (for video), and hang-up buttons
 */
export function CallControls({
    isVideoCall = false,
    className = '',
    variant = 'light',
}: CallControlsProps) {
    // Call store state
    const activeCall = useCallStore((state) => state.activeCall);
    const isMuted = useCallStore((state) => state.isMuted);
    const isCameraOff = useCallStore((state) => state.isCameraOff);
    const toggleMute = useCallStore((state) => state.toggleMute);
    const toggleCamera = useCallStore((state) => state.toggleCamera);
    const endCallMutation = useCallEnd();

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

    // Handle camera toggle
    const handleCameraToggle = () => {
        toggleCamera();
    };

    // Determine button styles based on variant
    const isDark = variant === 'dark';
    const buttonBaseClass = isDark
        ? 'border-2 border-white/30 bg-white/20 hover:bg-white/30'
        : 'border-2 border-[#31497C] bg-white hover:bg-gray-100';
    const iconColorClass = isDark ? 'text-white' : 'text-[#31497C]';
    const textColorClass = isDark ? 'text-white' : 'text-[#31497C]';

    return (
        <div className={`flex items-center justify-center gap-4 ${className}`}>
            {/* Mute Button */}
            <button
                onClick={handleMuteToggle}
                className={`
                    flex flex-col items-center justify-center
                    ${isDark ? 'w-16 h-16' : 'w-20 h-20'} rounded-full
                    transition-all duration-200
                    hover:scale-110 hover:shadow-lg
                    ${isMuted
                        ? 'bg-red-500 hover:bg-red-600 border-2 border-white/30'
                        : buttonBaseClass
                    }
                `}
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
                <svg
                    className={`${isDark ? 'w-6 h-6' : 'w-8 h-8'} ${isMuted ? 'text-white' : iconColorClass}`}
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
                {!isDark && (
                    <span className={`text-xs mt-1 font-verdana ${isMuted ? 'text-white' : textColorClass}`}>
                        {isMuted ? 'Unmute' : 'Mute'}
                    </span>
                )}
            </button>

            {/* Camera Toggle Button (Video Calls Only) */}
            {isVideoCall && (
                <button
                    onClick={handleCameraToggle}
                    className={`
                        flex flex-col items-center justify-center
                        ${isDark ? 'w-16 h-16' : 'w-20 h-20'} rounded-full
                        transition-all duration-200
                        hover:scale-110 hover:shadow-lg
                        ${isCameraOff
                            ? 'bg-red-500 hover:bg-red-600 border-2 border-white/30'
                            : buttonBaseClass
                        }
                    `}
                    title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                    <svg
                        className={`${isDark ? 'w-6 h-6' : 'w-8 h-8'} ${isCameraOff ? 'text-white' : iconColorClass}`}
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
                    {!isDark && (
                        <span className={`text-xs mt-1 font-verdana ${isCameraOff ? 'text-white' : textColorClass}`}>
                            {isCameraOff ? 'Camera' : 'Camera'}
                        </span>
                    )}
                </button>
            )}

            {/* Hang Up Button */}
            <button
                onClick={handleHangUp}
                disabled={endCallMutation.isPending}
                className={`
                    flex flex-col items-center justify-center
                    ${isDark ? 'w-16 h-16' : 'w-20 h-20'} rounded-full
                    bg-red-600 hover:bg-red-700
                    ${isDark ? 'border-2 border-white/30' : 'border-2 border-[#31497C]'}
                    transition-all duration-200
                    hover:scale-110 hover:shadow-lg
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="Hang Up"
                aria-label="Hang up call"
            >
                <svg
                    className={`${isDark ? 'w-6 h-6' : 'w-8 h-8'} text-white`}
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
                {!isDark && (
                    <span className="text-xs mt-1 text-white font-verdana">
                        Hang Up
                    </span>
                )}
            </button>
        </div>
    );
}
