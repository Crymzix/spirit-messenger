/**
 * MediaRecorder Utilities
 * Handles audio recording using the native Tauri mic-recorder plugin
 */

import { invoke } from '@tauri-apps/api/core';
import { startRecording as tauriStartRecording, stopRecording as tauriStopRecording } from 'tauri-plugin-mic-recorder-api';

export interface RecorderConfig {
  mimeType: string;
  audioBitsPerSecond?: number;
}

/**
 * Get the best supported MIME type for audio recording
 * With Tauri plugin, we use WAV format
 */
export function getSupportedMimeType(): string {
  return 'audio/wav';
}

/**
 * Start recording audio from user's microphone using Tauri plugin
 */
export async function startRecording() {
  try {
    // Stop any existing recording first to avoid "already in progress" error
    try {
      await tauriStopRecording();
    } catch {
      // Ignore errors if no recording is in progress
    }
    // Start native recording
    await tauriStartRecording();
  } catch (error) {
    throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface RecordingResult {
  /** Blob URL for playback in audio element */
  blobUrl: string;
  /** Audio blob for upload */
  blob: Blob;
}

/**
 * Stop recording and return audio blob
 * Retrieves the WAV file created by Tauri plugin
 */
export async function stopRecording(): Promise<RecordingResult> {
  try {
    // Stop recording and get the file path
    console.log('Stopping recording...');
    const audioPath = await tauriStopRecording();

    // Read the file bytes using Tauri command
    const bytes = await invoke<number[]>('read_file_bytes', { path: audioPath });

    // Create blob from bytes
    const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/wav' });

    // Create blob URL for playback
    const blobUrl = URL.createObjectURL(blob);

    return { blobUrl, blob };
  } catch (error) {
    throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeBlobUrl(blobUrl: string): void {
  URL.revokeObjectURL(blobUrl);
}

/**
 * Create an audio context for waveform visualization
 * Note: With Tauri plugin, real-time waveform is not available during recording
 * This returns a mock cleanup function
 */
export function createAudioAnalyzer(
  _mediaRecorder: MediaRecorder,
  dataCallback: (data: Uint8Array) => void
): () => void {
  // With Tauri native recording, we don't have access to the audio stream
  // Instead, generate a simulated waveform for UI feedback
  const simulatedData = new Uint8Array(128);

  const animationId = requestAnimationFrame(function draw() {
    // Generate random frequency data for visual feedback during recording
    for (let i = 0; i < simulatedData.length; i++) {
      simulatedData[i] = Math.floor(Math.random() * 200);
    }
    dataCallback(new Uint8Array(simulatedData));
    requestAnimationFrame(draw);
  });

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
  };
}
