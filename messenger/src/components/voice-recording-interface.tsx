/**
 * Voice Recording Interface
 * Inline recording UI that replaces textarea during voice recording
 */

import { useState, useEffect, useRef } from 'react';
import { startRecording, stopRecording, revokeBlobUrl } from '@/lib/utils/media-recorder-utils';

interface VoiceRecordingInterfaceProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecordingInterface({
  onSend,
  onCancel,
}: VoiceRecordingInterfaceProps) {
  const [status, setStatus] = useState<'recording' | 'stopped'>('recording');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackTotalDuration, setPlaybackTotalDuration] = useState(0);

  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldStopRef = useRef(false);
  const maxRecordingDuration = 60; // 60 seconds max

  const handleStopRecording = async () => {
    // Clear recording timer
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      const result = await stopRecording();
      console.log('Recording stopped:', result);

      setAudioBlob(result.blob);
      setBlobUrl(result.blobUrl);
      setStatus('stopped');

      // Create audio element for playback using blob URL
      const audio = new Audio(result.blobUrl);
      audioRef.current = audio;

      // Set up playback event listeners
      audio.addEventListener('loadedmetadata', () => {
        setPlaybackTotalDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setPlaybackCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlaybackCurrentTime(0);
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  // Initialize recording
  useEffect(() => {
    const initRecording = async () => {
      try {
        await startRecording();
        // Start recording timer
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => {
            const newDuration = prev + 1;
            if (newDuration >= maxRecordingDuration && !shouldStopRef.current) {
              // Auto-stop at max duration
              shouldStopRef.current = true;
              handleStopRecording();
              return prev;
            }
            return newDuration;
          });
        }, 1000);

      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    };

    initRecording();

    return () => {
      // Clean up on component unmount or window close
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Revoke blob URL to free memory
      if (blobUrl) {
        revokeBlobUrl(blobUrl);
      }
      stopRecording().catch(() => {
        // Ignore errors if recording already stopped
      });
    };
  }, [blobUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (!audioBlob) return;
    onSend(audioBlob, recordingDuration);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className='flex-1 flex gap-2 h-[45px]'>
      <div className="flex items-center gap-3 p-3 bg-[#E6ECF9] border border-[#7FA8D1]">
        {status === 'recording' ? (
          <>
            {/* Recording indicator */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span
                className="text-sm"
                style={{ fontFamily: 'Pixelated MS Sans Serif', color: '#31497C' }}
              >
                Recording...
              </span>
            </div>

            {/* Recording duration */}
            <span
              className="text-sm font-mono w-[50px]"
              style={{ fontFamily: 'Pixelated MS Sans Serif', color: '#31497C' }}
            >
              {formatTime(recordingDuration)}
            </span>

            {/* Recording progress bar */}
            <div className="flex-1 h-4 bg-white border-[1px] border-black w-52">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(recordingDuration / maxRecordingDuration) * 100}%`,
                }}
              />
            </div>

            {/* Stop button */}
            <div
              onClick={handleStopRecording}
              className="cursor-pointer flex-shrink-0 px-3 py-1 bg-[#31497C] text-white text-sm hover:bg-[#1f2f4c] transition-colors"
              style={{ fontFamily: 'Pixelated MS Sans Serif' }}
            >
              Stop
            </div>
          </>
        ) : (
          <>
            {/* Play button */}
            <div
              onClick={handlePlayPause}
              className="cursor-pointer flex-shrink-0 w-6 h-6 flex items-center justify-center bg-[#31497C] text-white pt-1 hover:bg-[#1f2f4c] transition-colors"
            >
              {isPlaying ? '⏸' : '▶'}
            </div>

            {/* Playback time display */}
            <span
              className="text-sm font-mono flex-shrink-0 w-[80px]"
              style={{ fontFamily: 'Pixelated MS Sans Serif', color: '#31497C' }}
            >
              {formatTime(playbackCurrentTime)} / {formatTime(playbackTotalDuration)}
            </span>

            {/* Playback progress bar */}
            <div className="flex-1 h-4 bg-white border-[1px] border-black w-52">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: playbackTotalDuration > 0
                    ? `${(playbackCurrentTime / playbackTotalDuration) * 100}%`
                    : '0%',
                }}
              />
            </div>

            {/* Cancel button */}
            <div
              onClick={onCancel}
              className="cursor-pointer flex-shrink-0 px-3 py-1 bg-[#31497C] text-white text-sm hover:bg-[#1f2f4c] transition-colors"
              style={{ fontFamily: 'Pixelated MS Sans Serif' }}
            >
              Cancel
            </div>
          </>
        )}
      </div>

      {/* Send button */}
      <div
        onClick={handleSend}
        className={`ml-auto !text-lg border border-[#93989C] bg-[#FBFBFB] w-[58px] h-full rounded-[5px] font-bold text-[0.6875em] flex items-center justify-center text-[#31497C] cursor-pointer`}
        style={{ boxShadow: '-4px -4px 4px #C0C9E0 inset', fontFamily: 'Pixelated MS Sans Serif' }}>
        Send
      </div>
    </div>
  );
}
