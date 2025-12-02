import { useUser } from "@/lib";
import { useCallStore } from "@/lib/store/call-store";
import { User } from "@/types"
import Avatar from "boring-avatars";
import { useEffect, useRef, useState } from "react";

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
            return { label: 'Connected', color: '#00AA00' };
        case 'checking':
        case 'new':
            return { label: 'Connecting...', color: '#FFA500' };
        case 'disconnected':
            return { label: 'Disconnected', color: '#FF6600' };
        case 'failed':
        case 'closed':
            return { label: 'Failed', color: '#FF0000' };
        default:
            return { label: 'Unknown', color: '#999999' };
    }
}

export function ChatAvatar({
    user,
    className
}: {
    user?: User | null
    className?: string
}) {
    const activeCall = useCallStore((state) => state.activeCall);
    const callState = useCallStore((state) => state.callState)
    const currentUser = useUser()
    const localStream = useCallStore((state) => state.localStream)
    const remoteStream = useCallStore((state) => state.remoteStream)
    const isAudioCall = !!activeCall && activeCall.callType === 'voice' && user
    const isVideoCall = !!activeCall && activeCall.callType === 'video' && user
    const iceConnectionState = useCallStore((state) => state.iceConnectionState);
    const isCurrentUser = user?.id === currentUser?.id

    const isMuted = useCallStore((state) => state.isMuted);
    const toggleMute = useCallStore((state) => state.toggleMute);
    const isRemoteMuted = useCallStore((state) => state.isMuted);
    const toggleRemoteMute = useCallStore((state) => state.toggleRemoteMute);
    const isCameraOff = useCallStore((state) => state.isCameraOff);
    const toggleCamera = useCallStore((state) => state.toggleCamera);

    // Audio state
    const [level, setLevel] = useState(0);
    const [userCeiling, setUserCeiling] = useState(75); // User setting (Default 75%)
    const audioDataRef = useRef<{
        mounted: boolean
        audioCtx: AudioContext | null;
        analyser: AnalyserNode | null;
        source: MediaStreamAudioSourceNode | null;
        dataArray?: Uint8Array;
        raf?: number;
    }>({ mounted: false, audioCtx: null, analyser: null, source: null });
    const audioPercent = Math.min(100, Math.round((level / 255) * 100));

    // Video state
    const videoRef = useRef<HTMLVideoElement>(null);

    // Get connection quality info
    const connectionQuality = getConnectionQuality(iceConnectionState);

    // Audio UI
    useEffect(() => {
        if (!isAudioCall && !isVideoCall) {
            return
        }

        if (!localStream && !remoteStream) {
            return
        }

        setupMic();

        return () => {
            audioDataRef.current.mounted = false
            const { audioCtx, raf } = audioDataRef.current;
            if (raf) {
                cancelAnimationFrame(raf);
            }
            if (audioCtx) {
                audioCtx.close();
            }
        };
    }, [
        isAudioCall,
        localStream,
        remoteStream,
        isCurrentUser,
    ]);

    // Video UI
    useEffect(() => {
        if (!isVideoCall) {
            return
        }
        if (!localStream && !remoteStream) {
            return
        }
        if (!videoRef.current) {
            return
        }

        if (isCurrentUser && localStream) {
            videoRef.current.srcObject = localStream;
        } else if (!isCurrentUser && remoteStream) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [
        isVideoCall,
        localStream,
        remoteStream,
        isCurrentUser,
    ])

    const setupMic = () => {
        try {
            if (audioDataRef.current.mounted) {
                return;
            }

            const audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(isCurrentUser ? localStream : remoteStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            source.connect(analyser);

            audioDataRef.current = { mounted: true, audioCtx, analyser, source, dataArray };

            const update = () => {
                const { analyser, dataArray } = audioDataRef.current;
                if (!analyser || !dataArray) return;

                analyser.getByteFrequencyData(dataArray as any);

                // Calculate average volume
                const avg =
                    dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length || 0;

                setLevel(avg);
                audioDataRef.current.raf = requestAnimationFrame(update);
            };

            update();
        } catch (err) {
            console.error("Microphone setup failed:", err);
        }
    }

    const renderVideo = () => {
        if (isCurrentUser) {
            if (!localStream) {
                return (
                    <div className="size-[167px] flex items-center justify-center bg-white border border-[#586170] rounded-[7px]">
                        <img src='/msn-logo.png' className="size-[96px]" />
                    </div>
                )
            } else {
                return (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="size-[167px] object-contain bg-black rounded-[7px]"
                    />
                )
            }
        }

        if (!remoteStream) {
            return (
                <div className="size-[167px] flex items-center justify-center bg-white border border-[#586170] rounded-[7px]">
                    <img src='/msn-logo.png' className="size-[96px]" />
                </div>
            )
        } else {
            return (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="size-[167px] object-contain bg-black rounded-[7px]"
                />
            )
        }
    }

    return (
        <div className={`hidden min-[470px]:block ${className}`}>
            <div className="flex gap-1">
                <div className={`${isVideoCall ? 'w-[200px]' : isAudioCall ? 'w-[130px]' : 'w-[104px]'} 
                    flex items-center flex-col border border-[#586170] pt-[3px] rounded-lg relative bg-[#dee7f7]`}>
                    <div className="flex gap-[7px]">
                        {
                            user ?
                                user?.isAiBot ?
                                    <Avatar name={user?.displayName || user?.username} colors={["#0481f6", "#4edfb3", "#ff005b", "#ff7d10", "#ffb238"]} variant="marble" square className='size-[96px] rounded-[7px]' /> :
                                    isVideoCall ? renderVideo() : <img className="size-[96px] border border-[#586170] rounded-[7px]" src={user?.displayPictureUrl || '/default-profile-pictures/friendly_dog.png'} alt="" /> :
                                <div className="size-[96px] bg-gray-300 rounded-[7px]" />
                        }
                        {
                            isAudioCall || isVideoCall ?
                                <div className="flex flex-col gap-2 items-center">
                                    {
                                        user?.id === currentUser?.id ?
                                            <div
                                                className="relative"
                                                onClick={toggleMute}
                                            >
                                                <img src='/mic.png' className="size-[14px]" />
                                                {
                                                    isMuted &&
                                                    <svg className="absolute top-0 size-[14px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
                                                        <circle cx="50" cy="50" r="45" stroke="red" stroke-width="10" fill="none" />
                                                        <line x1="20" y1="80" x2="80" y2="20" stroke="red" stroke-width="10" />
                                                    </svg>
                                                }
                                            </div> :
                                            <div
                                                className="relative"
                                                onClick={toggleRemoteMute}
                                            >
                                                <img src='/speaker.png' className="size-[14px]" />
                                                {
                                                    isRemoteMuted &&
                                                    <svg className="absolute top-0 size-[14px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
                                                        <circle cx="50" cy="50" r="45" stroke="red" stroke-width="10" fill="none" />
                                                        <line x1="20" y1="80" x2="80" y2="20" stroke="red" stroke-width="10" />
                                                    </svg>
                                                }
                                            </div>
                                    }
                                    <VerticalSlider
                                        limit={userCeiling}
                                        audioLevel={audioPercent}
                                        onChange={setUserCeiling}
                                    />
                                </div> : null
                        }
                    </div>
                    <div className="flex p-[3px_5px] w-full">
                        {
                            isVideoCall ?
                                isCurrentUser ?
                                    <div
                                        className="relative"
                                        onClick={toggleCamera}
                                    >
                                        <img src='/webcam.png' className="size-[14px]" />
                                        {
                                            isCameraOff &&
                                            <svg className="absolute top-0 size-[14px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
                                                <circle cx="50" cy="50" r="45" stroke="red" stroke-width="10" fill="none" />
                                                <line x1="20" y1="80" x2="80" y2="20" stroke="red" stroke-width="10" />
                                            </svg>
                                        }
                                    </div> :
                                    callState === 'connecting' ?
                                        <div className="text-[#31497C] text-sm">
                                            Loading...
                                        </div> :
                                        callState === 'active' ?
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="size-2 rounded-full"
                                                    style={{ backgroundColor: connectionQuality.color }}
                                                />
                                                <span className="text-sm font-verdana text-[#31497C]">
                                                    {connectionQuality.label}
                                                </span>
                                            </div> : null
                                : null
                        }
                        <img className="ml-auto" src="/down.png" alt="" />
                    </div>
                    <img className="absolute top-1 right-0 translate-x-[9px]" src="/expand-left.png" alt="" />
                </div>
            </div>
        </div>
    )
}

interface VerticalSliderProps {
    limit: number;      // The user-controlled slider position (0-100)
    audioLevel: number; // The current audio input level (0-100)
    onChange: (pct: number) => void;
}

function VerticalSlider({ limit, audioLevel, onChange }: VerticalSliderProps) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragging || !trackRef.current) return;
            const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
            const rect = trackRef.current.getBoundingClientRect();

            // Calculate position relative to bottom
            const offset = rect.bottom - clientY;
            const pct = Math.min(100, Math.max(0, (offset / rect.height) * 100));

            onChange(pct);
        };

        const onUp = () => setDragging(false);

        if (dragging) {
            document.addEventListener("mousemove", onMove);
            document.addEventListener("touchmove", onMove, { passive: false });
            document.addEventListener("mouseup", onUp);
            document.addEventListener("touchend", onUp);
        }

        return () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("touchmove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.removeEventListener("touchend", onUp);
        };
    }, [dragging, onChange]);

    const handleStart = (clientY: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const offset = rect.bottom - clientY;
        const pct = Math.min(100, Math.max(0, (offset / rect.height) * 100));
        onChange(pct);
    };

    // The green bar height is the audio level, capped by the limit (thumb position)
    const displayHeight = Math.min(audioLevel, limit);

    return (
        <div
            ref={trackRef}
            className="slider-track w-[10px] h-[37px] border border-[#31497C] relative flex items-end bg-gray-200 before:content-[''] before:absolute before:inset-0 before:bg-[repeating-linear-gradient(to_top,white_0px,white_2px,#31497C_2px,#31497C_3px,white_3px,white_3px)] before:z-10"
            onMouseDown={(e) => {
                setDragging(true);
                handleStart(e.clientY);
            }}
            onTouchStart={(e) => {
                setDragging(true);
                handleStart(e.touches[0].clientY);
            }}
        >
            <div
                className="absolute bottom-0 left-0 w-full bg-green-400 opacity-80 transition-all z-10"
                style={{ height: `${displayHeight}%` }}
            >
            </div>

            <div
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(limit)}
                className="flex absolute w-[16px] h-[7px] bg-white border border-[#31497C] rounded-full cursor-pointer -left-[4px] z-10"
                style={{ bottom: `calc(${limit}% - 6px)` }}
            >
                <div className="w-[3px] bg-[#31497C]"></div>
                <div
                    className="flex-1 bg-gradient-to-r from-[#f6f6f6] to-[#c9d9f1]">
                </div>
                <div className="w-[3px] bg-[#31497C]"></div>
            </div>
        </div>
    );
}