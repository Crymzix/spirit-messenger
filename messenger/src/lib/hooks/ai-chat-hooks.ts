import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getAIConversations,
    getAIConversationMessages,
} from '../services/ai-service';
import type { AIConversation, AIMessage } from '@/types/ai';

export const aiChatKeys = {
    all: ['ai-chat'] as const,
    conversations: () => [...aiChatKeys.all, 'conversations'] as const,
    conversation: (id: string) => [...aiChatKeys.conversations(), id] as const,
    messages: (conversationId: string) => [...aiChatKeys.all, 'messages', conversationId] as const,
};

export function useAIConversations() {
    return useQuery({
        queryKey: aiChatKeys.conversations(),
        queryFn: getAIConversations,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });
}

export function useAIMessages(conversationId: string) {
    return useQuery({
        queryKey: aiChatKeys.messages(conversationId),
        queryFn: () => getAIConversationMessages(conversationId),
        enabled: !!conversationId,
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 5,
    });
}

export function useAIChatQueryClient() {
    const queryClient = useQueryClient();

    return {
        // Add a new conversation to the cache
        addConversation: (conversation: AIConversation) => {
            queryClient.setQueryData<AIConversation[]>(
                aiChatKeys.conversations(),
                (old = []) => [conversation, ...old]
            );
        },

        // Update conversation title in cache
        updateConversationTitle: (conversationId: string, title: string) => {
            queryClient.setQueryData<AIConversation[]>(
                aiChatKeys.conversations(),
                (old = []) => old.map(c =>
                    c.id === conversationId ? { ...c, title } : c
                )
            );
        },

        // Add a message to the cache
        addMessage: (conversationId: string, message: AIMessage) => {
            queryClient.setQueryData<AIMessage[]>(
                aiChatKeys.messages(conversationId),
                (old = []) => [...old, message]
            );
        },

        // Update the last message (for streaming)
        updateLastMessage: (conversationId: string, content: string) => {
            queryClient.setQueryData<AIMessage[]>(
                aiChatKeys.messages(conversationId),
                (old = []) => {
                    if (old.length === 0) return old;
                    const updated = [...old];
                    const lastIdx = updated.length - 1;
                    updated[lastIdx] = { ...updated[lastIdx], content };
                    return updated;
                }
            );
        },

        // Invalidate conversations
        invalidateConversations: () => {
            queryClient.invalidateQueries({
                queryKey: aiChatKeys.conversations(),
            });
        },

        // Invalidate messages
        invalidateMessages: (conversationId: string) => {
            queryClient.invalidateQueries({
                queryKey: aiChatKeys.messages(conversationId),
            });
        },
    };
}
