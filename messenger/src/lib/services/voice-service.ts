/**
 * Voice Service
 * Handles voice clip upload and management
 */

import { createAuthHeaders } from '../api-client';
import type { Message } from '@/types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:6666';

export interface SendVoiceClipRequest {
  conversationId: string;
  audioFile: File;
  duration: number;
}

export interface SendVoiceClipResponse {
  success: boolean;
  data?: {
    message: Message;
    file: {
      id: string;
      messageId: string;
      filename: string;
      fileSize: number;
      mimeType: string;
      storagePath: string;
    };
  };
  error?: string;
}

/**
 * Send a voice clip to a conversation
 */
export async function sendVoiceClip(
  request: SendVoiceClipRequest
): Promise<SendVoiceClipResponse> {
  const formData = new FormData();
  formData.append('conversationId', request.conversationId);
  formData.append('duration', request.duration.toString());
  formData.append('file', request.audioFile, request.audioFile.name);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText) as SendVoiceClipResponse;
          resolve(response);
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const response = JSON.parse(xhr.responseText);
          reject(new Error(response.error || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_BASE_URL}/api/messages/voice-clip`);

    // Add auth headers
    const headers = createAuthHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.send(formData);
  });
}
