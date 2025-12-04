import { apiDelete, apiGet } from '../api-client';
import type {
    AIMessage,
    AIConversation,
} from '@/types/ai';
import { supabase } from '../supabase';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:6666';

export async function getAIConversations(): Promise<AIConversation[]> {
    const response = await apiGet<{ conversations: AIConversation[] }>(
        '/api/ai/conversations'
    );

    if (response.success && response.data) {
        return response.data.conversations;
    }

    throw new Error(response.error || 'Failed to fetch conversations');
}

export async function getAIConversationMessages(
    conversationId: string,
    limit: number = 50
): Promise<AIMessage[]> {
    const response = await apiGet<{ messages: AIMessage[] }>(
        `/api/ai/conversations/${conversationId}/messages?limit=${limit}`
    );

    if (response.success && response.data) {
        return response.data.messages;
    }

    throw new Error(response.error || 'Failed to fetch messages');
}

export async function deleteAIConversation(conversationId: string): Promise<void> {
    const response = await apiDelete(`${API_BASE_URL}/api/ai/conversations/${conversationId}`);

    if (!response.success) {
        throw new Error('Failed to delete conversation');
    }
}

export interface StreamCallbacks {
    onConversation?: (conversation: AIConversation) => void;
    onChunk?: (chunk: string) => void;
    onComplete?: (data: {
        message: AIMessage;
        userMessage: AIMessage;
        conversationId: string;
        title?: string;
    }) => void;
    onError?: (error: string) => void;
}

export async function sendAIMessageStream(
    data: {
        conversationId?: string;
        content: string;
        webSearchEnabled: boolean;
        model: string;
    },
    callbacks: StreamCallbacks
): Promise<void> {
    const { data: {
        session
    } } = await supabase.auth.getSession()

    const token = session?.access_token

    const response = await fetch(`${API_BASE_URL}/api/ai/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        callbacks.onError?.(errorData.error || 'Failed to send message');
        return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
        callbacks.onError?.('No response body');
        return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'conversation') {
                            callbacks.onConversation?.(data.conversation);
                        } else if (data.chunk) {
                            callbacks.onChunk?.(data.chunk);
                        } else if (data.done) {
                            callbacks.onComplete?.({
                                message: data.message,
                                userMessage: data.userMessage,
                                conversationId: data.conversationId,
                                title: data.title,
                            });
                        } else if (data.error) {
                            callbacks.onError?.(data.error);
                        }
                    } catch {
                        // Skip malformed JSON
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
