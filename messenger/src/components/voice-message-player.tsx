/**
 * Voice Message Player
 * Component for playing voice clips in chat messages
 */

import { useState, useRef, useEffect } from 'react';

interface VoiceMessagePlayerProps {
  voiceClipUrl: string;
  duration?: number;
  senderName?: string;
}

export function VoiceMessagePlayer({
  voiceClipUrl,
  duration = 0,
  senderName,
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(voiceClipUrl);

    audio.addEventListener('canplay', () => {
      setIsLoading(false);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('error', () => {
      setError('Failed to load voice clip');
      setIsLoading(false);
    });

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [voiceClipUrl]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Failed to play audio');
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * audioRef.current.duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayDuration = audioRef.current?.duration || duration || 0;
  const progressPercent = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  if (error) {
    return (
      <div className="text-sm text-red-600" style={{ fontFamily: 'Verdana' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="flex mt-2 items-center gap-2 px-3 py-2 bg-[#E6ECF9] border border-[#7FA8D1] w-fit max-w-xs">
      {/* Play/Pause button */}
      <div
        onClick={handlePlayPause}
        className="cursor-pointer pt-1 flex-shrink-0 w-7 h-7 flex items-center justify-center bg-[#31497C] text-white hover:bg-[#1f2f4c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <span className="text-xs">⟳</span>
        ) : isPlaying ? (
          '⏸'
        ) : (
          '▶'
        )}
      </div>

      {/* Time display */}
      <span
        className="text-xs font-mono flex-shrink-0 w-[50px]"
        style={{ fontFamily: 'Pixelated MS Sans Serif', color: '#31497C' }}
      >
        {formatTime(currentTime)} / {formatTime(displayDuration)}
      </span>

      {/* Progress bar */}
      <div
        className="flex-1 h-1.5 bg-[#7FA8D1] cursor-pointer min-w-[96px]"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-[#31497C] transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Speaker icon */}
      <div className="flex-shrink-0 text-[#31497C] pt-1 flex-shrink-0 w-7 h-7 flex items-center justify-center ">♪</div>
    </div>
  );
}
