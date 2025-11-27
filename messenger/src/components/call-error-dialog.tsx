/**
 * Call Error Dialog Component
 * Displays user-friendly error messages for call-related failures
 * Handles both media permission errors and connection errors
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

interface CallErrorDialogProps {
    error: string | null;
    onClose: () => void;
}

export function CallErrorDialog({ error, onClose }: CallErrorDialogProps) {
    if (!error) return null;

    // Determine error type for contextual help
    const isMediaError = error.includes('permission') ||
        error.includes('microphone') ||
        error.includes('camera') ||
        error.includes('device');

    const isConnectionError = error.includes('Connection') ||
        error.includes('network') ||
        error.includes('reconnect');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div
                className="bg-white rounded shadow-lg max-w-md w-full mx-4"
                style={{
                    background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                }}
            >
                {/* Title bar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#9A9FD0]">
                    <div className="flex items-center gap-2">
                        <img src='/msn.png' className="size-5" alt="MSN" />
                        <div
                            className="text-[#31497C] text-sm font-semibold"
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        >
                            Call Error
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-5 text-sm font-bold text-white rounded bg-[#bf3128] border border-white flex items-center justify-center hover:bg-[#d63a30] cursor-pointer"
                        title="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-start gap-3">
                        {/* Error icon */}
                        <div className="flex-shrink-0">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        {/* Error message */}
                        <div className="flex-1">
                            <p className="text-[#31497C] text-sm leading-relaxed">
                                {error}
                            </p>

                            {/* Helpful tips for media errors */}
                            {isMediaError && (
                                <div className="mt-3 text-xs text-[#31497C] opacity-80">
                                    <p className="font-semibold mb-1">To fix this:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {error.includes('permission denied') && (
                                            <>
                                                <li>Check your browser/system permissions</li>
                                                <li>Allow access when prompted</li>
                                                <li>Restart the application if needed</li>
                                            </>
                                        )}
                                        {error.includes('not found') && (
                                            <>
                                                <li>Connect a microphone or camera</li>
                                                <li>Check device connections</li>
                                                <li>Verify device is recognized by your system</li>
                                            </>
                                        )}
                                        {error.includes('already in use') && (
                                            <>
                                                <li>Close other applications using the device</li>
                                                <li>End other active calls</li>
                                                <li>Restart your browser or application</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* Helpful tips for connection errors */}
                            {isConnectionError && (
                                <div className="mt-3 text-xs text-[#31497C] opacity-80">
                                    <p className="font-semibold mb-1">To fix this:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Check your internet connection</li>
                                        <li>Verify your network allows WebRTC connections</li>
                                        <li>Try again in a few moments</li>
                                        <li>Contact your network administrator if the issue persists</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Close button */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-[#31497C] hover:bg-[#4a6ba8] text-white rounded text-sm font-medium transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
