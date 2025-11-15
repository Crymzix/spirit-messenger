/**
 * Message service for sending and managing messages
 * Handles message operations through Backend Service API
 */

import { apiPost, apiGet } from '../api-client';
import type { Message, Conversation, User } from '@/types';

export interface SendMessageData {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'file' | 'system';
    metadata?: {
        emoticons?: Array<{ position: number; code: string }>;
        formatting?: { bold?: boolean; italic?: boolean; color?: string };
        fileInfo?: { filename: string; size: number; mimeType: string };
    };
}

export interface CreateConversationData {
    type: 'one_on_one' | 'group';
    participantIds: string[];
    name?: string;
}

export interface MessageWithSender extends Message {
    sender: User;
}

export interface ConversationWithParticipants extends Conversation {
    participants: User[];
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(data: SendMessageData): Promise<{
    success: boolean;
    message?: Message;
    error?: string;
}> {
    const response = await apiPost<{ message: Message }>(
        '/api/messages',
        {
            conversationId: data.conversationId,
            content: data.content,
            messageType: data.messageType || 'text',
            metadata: data.metadata || {},
        }
    );

    if (response.success && response.data) {
        return {
            success: true,
            message: response.data.message,
        };
    }

    return {
        success: false,
        error: response.error || 'Failed to send message',
    };
}

/**
 * Create a new conversation
 */
export async function createConversation(data: CreateConversationData): Promise<{
    success: boolean;
    conversation?: ConversationWithParticipants;
    error?: string;
}> {
    const response = await apiPost<{ conversation: ConversationWithParticipants }>(
        '/api/messages/conversations',
        {
            type: data.type,
            participantIds: data.participantIds,
            name: data.name,
        }
    );

    if (response.success && response.data) {
        return {
            success: true,
            conversation: response.data.conversation,
        };
    }

    return {
        success: false,
        error: response.error || 'Failed to create conversation',
    };
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
): Promise<{
    success: boolean;
    messages?: MessageWithSender[];
    error?: string;
}> {
    let endpoint = `/api/messages/conversations/${conversationId}/messages?limit=${limit}`;
    if (beforeMessageId) {
        endpoint += `&beforeMessageId=${beforeMessageId}`;
    }

    const response = await apiGet<{ messages: MessageWithSender[] }>(endpoint);

    if (response.success && response.data) {
        return {
            success: true,
            messages: response.data.messages,
        };
    }

    return {
        success: false,
        error: response.error || 'Failed to get messages',
    };
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<{
    success: boolean;
    conversation?: ConversationWithParticipants;
    error?: string;
}> {
    const response = await apiGet<{ conversation: ConversationWithParticipants }>(
        `/api/messages/conversations/${conversationId}`
    );

    if (response.success && response.data) {
        return {
            success: true,
            conversation: response.data.conversation,
        };
    }

    return {
        success: false,
        error: response.error || 'Failed to get conversation',
    };
}

/**
 * Get all conversations for the current user
 */
export async function getUserConversations(): Promise<{
    success: boolean;
    conversations?: ConversationWithParticipants[];
    error?: string;
}> {
    const response = await apiGet<{ conversations: ConversationWithParticipants[] }>(
        '/api/messages/conversations'
    );

    if (response.success && response.data) {
        return {
            success: true,
            conversations: response.data.conversations,
        };
    }

    return {
        success: false,
        error: response.error || 'Failed to get conversations',
    };
}

/**
 * Leave a conversation
 */
export async function leaveConversation(conversationId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const response = await apiPost<{ success: boolean }>(
        `/api/messages/conversations/${conversationId}/leave`,
        {}
    );

    if (response.success) {
        return {
            success: true,
        };
    }

    return {
        success: false,
        error: response.error || 'Failed to leave conversation',
    };
}
