/**
 * Voice Hooks
 * React hooks for voice clip functionality
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendVoiceClip } from '../services/voice-service';

export function useSendVoiceClip(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { audioFile: File; duration: number }) =>
      sendVoiceClip({
        conversationId,
        audioFile: data.audioFile,
        duration: data.duration,
      }),
    onSuccess: () => {
      // Invalidate messages query to show new voice message
      queryClient.invalidateQueries({
        queryKey: ['messages', conversationId],
      });
    },
    onError: (error) => {
      console.error('Failed to send voice clip:', error);
    },
  });
}
