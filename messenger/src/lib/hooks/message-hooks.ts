/**
 * React Query hooks for message operations
 * Provides hooks for sending messages, creating conversations, and fetching messages
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { emit } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
    sendMessage,
    createConversation,
    getConversationMessages,
    getConversation,
    getUserConversations,
    leaveConversation,
    sendNudge,
    getUnreadCounts,
    markMessagesAsRead,
    type SendMessageData,
    type CreateConversationData,
    type MessageWithSender,
} from '../services/message-service';
import { soundService } from '../services/sound-service';
import { showNotificationWindow } from '../utils/window-utils';
import { useAuthStore } from '../store/auth-store';
import type { User, Contact, Bot, MessageType } from '@/types';
import { WINDOW_EVENTS } from '../utils/constants';

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
                // Backend returns messages ordered by desc(createdAt), so last item is the oldest
                return lastPage[lastPage.length - 1]?.id || null;
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

export interface MessagePayload {
    content: string
    conversation_id: string
    created_at: string
    delivered_at: string | null
    id: string
    message_type: MessageType
    metadata?: {
        winkUrl?: string
        winkType?: 'gif' | 'sticker' | 'meme'
    }
    read_at: string | null
    sender_id: string
}

/**
 * Hook to set up real-time message updates for a specific conversation
 * Subscribes to messages table changes and invalidates React Query cache
 * Works with both regular and infinite query hooks
 */
export function useConversationRealtimeUpdates(
    conversationId: string | undefined,
    onMessageInserted?: (message: MessagePayload) => void
) {
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
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        onMessageInserted?.(payload.new as MessagePayload)
                    }
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
    }) => void,
    onShowNotification?: (payload: {
        senderId: string;
        senderName: string;
        messagePreview: string;
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
                        await emit(WINDOW_EVENTS.NUDGE_RECEIVED, {
                            conversationId,
                            senderId,
                        });
                    } else {
                        // Check if chat window for this conversation is open and focused
                        // Window is labeled with the contact's user ID, and senderId is who sent the message
                        const chatWindowLabel = `chat-${senderId}`;
                        const chatWindow = await WebviewWindow.getByLabel(chatWindowLabel);

                        // Get sender name from cached contacts
                        const contacts = queryClient.getQueryData<Contact[]>(['contacts', 'accepted']);
                        const contact = contacts?.find(c => c.contactUser?.id === senderId);
                        let senderName = 'Unknown'
                        if (contact) {
                            senderName = contact?.contactUser?.displayName || contact?.contactUser?.email
                        } else {
                            // Retrieve from cached bots
                            const bots = queryClient.getQueryData<Bot[]>(['bots']);
                            const bot = bots?.find(b => b.id === senderId);
                            senderName = bot?.displayName || bot?.email || 'Unknown'
                        }

                        const message = `${senderName} says:`
                        const description = newMessage.content || '';

                        if (!chatWindow) {
                            soundService.playMessageSound();
                            // Show notification with sender name from cache
                            showNotificationWindow(message, description, senderId)
                        } else {
                            const isFocused = await chatWindow.isFocused();
                            if (!isFocused) {
                                soundService.playMessageSound();
                                // Show notification with sender name from cache
                                showNotificationWindow(message, description, senderId)
                            }
                        }
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
    }, [currentUser?.id, queryClient, onMessageReceived, onShowNotification]);
}

/**
 * Hook for fetching unread message counts by user ID
 * Returns a map of userId -> unread count
 * Includes realtime subscription for incremental updates
 */
export function useUnreadCounts() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const currentUser = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();

    // Set up realtime subscription for incremental updates
    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase
            .channel(`unread-updates-${currentUser.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=neq.${currentUser.id}`,
                },
                (payload) => {
                    // Increment count for this sender
                    const senderId = payload.new.sender_id as string;
                    queryClient.setQueryData<Record<string, number>>(['unreadCounts'], (old) => {
                        if (!old) return { [senderId]: 1 };
                        return {
                            ...old,
                            [senderId]: (old[senderId] || 0) + 1,
                        };
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=neq.${currentUser.id}`,
                },
                (payload) => {
                    // If readAt was set (message marked as read), decrement count
                    const oldReadAt = payload.old.read_at;
                    const newReadAt = payload.new.read_at;
                    const senderId = payload.new.sender_id as string;

                    if (!oldReadAt && newReadAt) {
                        // Message was marked as read
                        queryClient.setQueryData<Record<string, number>>(['unreadCounts'], (old) => {
                            if (!old) return {};
                            const newCount = Math.max(0, (old[senderId] || 0) - 1);
                            if (newCount === 0) {
                                const { [senderId]: _, ...rest } = old;
                                return rest;
                            }
                            return {
                                ...old,
                                [senderId]: newCount,
                            };
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id, queryClient]);

    return useQuery({
        queryKey: ['unreadCounts'],
        queryFn: async () => {
            const response = await getUnreadCounts();
            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch unread counts');
            }
            return response.counts || {};
        },
        staleTime: Infinity, // Don't refetch automatically, we update via realtime
        gcTime: 1000 * 60 * 30, // 30 minutes
        enabled: isAuthenticated,
    });
}

/**
 * Hook for marking messages as read in a conversation
 */
export function useMarkMessagesAsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: string) => {
            return markMessagesAsRead(conversationId);
        },
        onSuccess: (response, conversationId) => {
            if (response.success) {
                // The realtime subscription will handle updating the counts
                // Also invalidate the conversation messages to update readAt fields
                queryClient.invalidateQueries({ queryKey: messageKeys.messages(conversationId) });
            }
        },
        onError: (error) => {
            console.error('Failed to mark messages as read:', error);
        },
    });
}
