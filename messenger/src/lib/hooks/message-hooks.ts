/**
 * React Query hooks for message operations
 * Provides hooks for sending messages, creating conversations, and fetching messages
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { emit } from '@tauri-apps/api/event';
import {
    sendMessage,
    createConversation,
    getConversationMessages,
    getConversation,
    getUserConversations,
    leaveConversation,
    sendNudge,
    type SendMessageData,
    type CreateConversationData,
    type MessageWithSender,
} from '../services/message-service';
import { soundService } from '../services/sound-service';
import { useAuthStore } from '../store/auth-store';
import type { User } from '@/types';

/**
 * Query key factory for message-related queries
 */
export const messageKeys = {
    all: ['messages'] as const,
    conversations: () => [...messageKeys.all, 'conversations'] as const,
    conversation: (id: string) => [...messageKeys.conversations(), id] as const,
    messages: (conversationId: string) => [...messageKeys.all, 'conversation', conversationId] as const,
};

/**
 * Hook for sending a message
 * Includes optimistic updates for instant UI feedback
 * Works with both regular and infinite query hooks
 */
export function useSendMessage(conversationId: string) {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);

    return useMutation({
        mutationFn: (data: SendMessageData) => {
            return sendMessage(data);
        },
        onMutate: async (data) => {
            // Cancel any outgoing refetches for both regular and infinite queries
            await queryClient.cancelQueries({ queryKey: messageKeys.messages(conversationId) });

            // Snapshot the previous value (for regular query)
            const previousMessages = queryClient.getQueryData<MessageWithSender[]>(
                messageKeys.messages(conversationId)
            );

            // Optimistically update to the new value
            if (currentUser) {
                const optimisticMessage: MessageWithSender = {
                    id: `temp-${Date.now()}`,
                    conversationId: data.conversationId,
                    senderId: currentUser.id,
                    sender: {
                        ...currentUser,
                        lastSeen: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as User,
                    content: data.content,
                    messageType: data.messageType || 'text',
                    metadata: data.metadata || {},
                    createdAt: new Date(),
                    deliveredAt: undefined,
                    readAt: undefined,
                };

                // Update regular query if it exists
                queryClient.setQueryData<MessageWithSender[]>(
                    messageKeys.messages(conversationId),
                    (old) => {
                        if (!old) return [optimisticMessage];
                        return [...old, optimisticMessage];
                    }
                );

                // Update infinite query if it exists
                queryClient.setQueryData(
                    [...messageKeys.messages(conversationId), 'infinite'],
                    (old: any) => {
                        if (!old) return old;
                        // Add the optimistic message to the last page (most recent messages)
                        const newPages = [...old.pages];
                        if (newPages.length > 0) {
                            // Add to the end of the last page (newest messages)
                            newPages[newPages.length - 1] = [
                                ...newPages[newPages.length - 1],
                                optimisticMessage,
                            ];
                        } else {
                            newPages.push([optimisticMessage]);
                        }
                        return {
                            ...old,
                            pages: newPages,
                        };
                    }
                );
            }

            // Return a context object with the snapshotted value
            return { previousMessages };
        },
        onError: (err, _variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousMessages) {
                queryClient.setQueryData(
                    messageKeys.messages(conversationId),
                    context.previousMessages
                );
            }
            console.error('Failed to send message:', err);
        },
        onSuccess: (response) => {
            if (response.success) {
                // Invalidate and refetch messages to get the real message from the server
                // This will update both regular and infinite queries
                queryClient.invalidateQueries({ queryKey: messageKeys.messages(conversationId) });

                // Also invalidate conversations list to update last message
                queryClient.invalidateQueries({ queryKey: messageKeys.conversations() });
            }
        },
    });
}

/**
 * Hook for creating a new conversation
 */
export function useCreateConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateConversationData) => {
            return createConversation(data);
        },
        onSuccess: (response) => {
            if (response.success) {
                // Invalidate conversations list to include the new conversation
                queryClient.invalidateQueries({ queryKey: messageKeys.conversations() });
            }
        },
        onError: (error) => {
            console.error('Failed to create conversation:', error);
        },
    });
}

/**
 * Hook for fetching messages for a conversation
 */
export function useConversationMessages(
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
) {
    return useQuery({
        queryKey: [...messageKeys.messages(conversationId), limit, beforeMessageId],
        queryFn: async () => {
            const response = await getConversationMessages(conversationId, limit, beforeMessageId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch messages');
            }
            return response.messages || [];
        },
        staleTime: 1000 * 30, // 30 seconds - messages are relatively fresh
        gcTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!conversationId,
    });
}

/**
 * Hook for fetching messages with infinite scroll/pagination support
 * Loads messages in pages of 50, with "Load More" functionality for older messages
 */
export function useConversationMessagesInfinite(conversationId: string, pageSize: number = 50) {
    return useInfiniteQuery({
        queryKey: [...messageKeys.messages(conversationId), 'infinite'],
        queryFn: async ({ pageParam }) => {
            const response = await getConversationMessages(
                conversationId,
                pageSize,
                pageParam as string | undefined
            );
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch messages');
            }
            return response.messages || [];
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => {
            // If we got a full page, there might be more messages
            // Use the oldest message ID as the cursor for the next page
            if (lastPage.length === pageSize) {
                return lastPage[0]?.id || null; // First message is the oldest
            }
            return null; // No more pages
        },
        staleTime: 1000 * 30, // 30 seconds
        gcTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!conversationId,
        select: (data) => {
            // Flatten all pages and reverse to show chronological order
            // Pages come in reverse chronological order (newest first)
            // Within each page, messages are also in reverse chronological order
            const allMessages = data.pages.flat();
            // Reverse to get chronological order (oldest to newest)
            return {
                pages: data.pages,
                pageParams: data.pageParams,
                messages: allMessages.reverse(),
            };
        },
    });
}

/**
 * Hook for fetching a specific conversation
 */
export function useConversation(conversationId: string) {
    return useQuery({
        queryKey: messageKeys.conversation(conversationId),
        queryFn: async () => {
            const response = await getConversation(conversationId);
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch conversation');
            }
            return response.conversation;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        enabled: !!conversationId,
    });
}

/**
 * Hook for fetching all conversations for the current user
 */
export function useConversations() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return useQuery({
        queryKey: messageKeys.conversations(),
        queryFn: async () => {
            const response = await getUserConversations();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch conversations');
            }
            return response.conversations || [];
        },
        staleTime: 1000 * 60, // 1 minute
        gcTime: 1000 * 60 * 10, // 10 minutes
        enabled: isAuthenticated,
    });
}

/**
 * Hook for leaving a conversation
 */
export function useLeaveConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: string) => {
            return leaveConversation(conversationId);
        },
        onSuccess: (response, conversationId) => {
            if (response.success) {
                // Remove the conversation from the cache
                queryClient.invalidateQueries({ queryKey: messageKeys.conversations() });
                queryClient.removeQueries({ queryKey: messageKeys.conversation(conversationId) });
                queryClient.removeQueries({ queryKey: messageKeys.messages(conversationId) });
            }
        },
        onError: (error) => {
            console.error('Failed to leave conversation:', error);
        },
    });
}

/**
 * Hook to set up real-time message updates for a specific conversation
 * Subscribes to messages table changes and invalidates React Query cache
 * Works with both regular and infinite query hooks
 */
export function useConversationRealtimeUpdates(conversationId: string | undefined) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!conversationId) return;

        const channel = supabase
            .channel(`conversation-messages-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => {
                    // Invalidate both regular and infinite queries to refetch and show the new message
                    // This ensures we get the complete message with sender info
                    queryClient.invalidateQueries({
                        queryKey: messageKeys.messages(conversationId)
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, queryClient]);
}

/**
 * Hook for sending a nudge to a conversation
 */
export function useSendNudge(conversationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            return sendNudge(conversationId);
        },
        onSuccess: (response) => {
            if (response.success) {
                // Play nudge sound for sender
                soundService.playNudgeSound();

                // Invalidate messages to show the nudge
                queryClient.invalidateQueries({ queryKey: messageKeys.messages(conversationId) });

                // Also invalidate conversations list to update last message
                queryClient.invalidateQueries({ queryKey: messageKeys.conversations() });
            }
        },
        onError: (error) => {
            console.error('Failed to send nudge:', error);
        },
    });
}

/**
 * Hook to set up global real-time message updates for all user conversations
 * Listens to all new messages where the sender is NOT the current user
 * Should be used in MainWindow to listen across all conversations
 */
export function useGlobalMessageUpdates(
    onMessageReceived?: (payload: {
        conversationId: string;
        senderId: string;
        messageType: string;
        metadata?: any;
    }) => void
) {
    const queryClient = useQueryClient();
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        if (!currentUser?.id) return;

        // Subscribe to all messages NOT sent by the current user
        // This filters at the database level using sender_id != current user
        const channel = supabase
            .channel(`global-messages-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=neq.${currentUser.id}`,
                },
                async (payload) => {
                    const newMessage = payload.new as any;
                    const conversationId = newMessage.conversation_id;
                    const senderId = newMessage.sender_id;

                    // Check if this is a nudge message
                    if (newMessage.metadata?.action === 'nudge') {
                        // Play nudge sound
                        soundService.playNudgeSound();

                        // Emit event to notify the specific chat window
                        await emit('nudge-received', {
                            conversationId,
                            senderId,
                        });
                    }

                    // Invalidate the specific conversation messages
                    queryClient.invalidateQueries({
                        queryKey: messageKeys.messages(conversationId)
                    });

                    // Invalidate conversations list to update last message preview
                    queryClient.invalidateQueries({
                        queryKey: messageKeys.conversations()
                    });

                    // Call the callback if provided
                    onMessageReceived?.({
                        conversationId,
                        senderId,
                        messageType: newMessage.message_type,
                        metadata: newMessage.metadata,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, queryClient, onMessageReceived]);
}
