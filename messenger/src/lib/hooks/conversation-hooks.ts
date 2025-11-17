/**
 * Conversation hooks for managing conversations
 * Handles finding or creating conversations when opening chat windows
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createConversation, type ConversationWithParticipants } from '../services/message-service';
import { supabase } from '../supabase';
import type { User } from '@/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook to find or create a one-on-one conversation with a contact
 *
 * This hook will:
 * - Attempt to create a conversation with the given contact
 * - If a conversation already exists, the backend returns it
 * - If no conversation exists, the backend creates a new one
 *
 * @param contactId - The ID of the contact to start a conversation with
 * @returns Query result containing conversation data, loading state, and error
 */
export function useConversation(contactId: string | null) {
    return useQuery<ConversationWithParticipants, Error>({
        queryKey: ['conversation', 'one-on-one', contactId],
        queryFn: async () => {
            if (!contactId) {
                throw new Error('Contact ID is required');
            }

            const result = await createConversation({
                type: 'one_on_one',
                participantIds: [contactId],
            });

            if (!result.success || !result.conversation) {
                throw new Error(result.error || 'Failed to create conversation');
            }

            return result.conversation;
        },
        enabled: !!contactId, // Only run query if contactId is provided
        staleTime: Infinity, // Conversation data doesn't change often
        retry: 3,
    });
}

/**
 * Hook to listen for real-time updates to participant user data
 * Subscribes to changes in the users table for all participants except the current user
 *
 * @param participants - Array of participant users to listen to (should exclude current user)
 * @param conversationId - The conversation ID for invalidating queries
 */
export function useParticipantRealtimeUpdates(
    participants: User[] | undefined,
    conversationId: string | undefined
) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!participants || participants.length === 0 || !conversationId) return;

        const participantIds = participants.map(p => p.id);

        // Create a channel for listening to user updates
        const channel = supabase
            .channel(`participants:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                },
                (payload: RealtimePostgresChangesPayload<User>) => {
                    const updatedUserId = (payload.new as User).id;

                    // Only invalidate if the updated user is one of our participants
                    if (participantIds.includes(updatedUserId)) {
                        // Invalidate conversation query to refetch with updated participant data
                        queryClient.invalidateQueries({
                            queryKey: ['conversation', 'one-on-one']
                        });
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [participants, conversationId, queryClient]);
}
