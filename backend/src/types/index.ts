import { FastifyReply } from 'fastify';
import { User } from '@supabase/supabase-js';

// Extend Fastify request to include authenticated user
declare module 'fastify' {
    interface FastifyRequest {
        user?: User;
    }

    interface FastifyInstance {
        authenticate: (request: import('fastify').FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

// User types
export interface UserProfile {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    personalMessage: string | null;
    displayPictureUrl: string | null;
    presenceStatus: 'online' | 'away' | 'busy' | 'appear_offline' | 'offline';
    lastSeen: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

// Contact types
export interface Contact {
    id: string;
    userId: string;
    contactUserId: string;
    status: 'pending' | 'accepted' | 'blocked';
    createdAt: Date;
}

// Message types
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'file' | 'system';
    metadata: MessageMetadata | null;
    createdAt: Date;
    deliveredAt: Date | null;
    readAt: Date | null;
}

export interface MessageMetadata {
    emoticons?: Array<{ position: number; code: string }>;
    formatting?: { bold?: boolean; italic?: boolean; color?: string };
    fileInfo?: { filename: string; size: number; mimeType: string };
}

// Conversation types
export interface Conversation {
    id: string;
    type: 'one_on_one' | 'group';
    name: string | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// Authentication types
export interface RegisterRequest {
    email: string;
    password: string;
    username: string;
    displayName: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        username: string;
        displayName: string | null;
        personalMessage?: string | null;
        displayPictureUrl?: string | null;
        presenceStatus?: string | null;
    };
}
