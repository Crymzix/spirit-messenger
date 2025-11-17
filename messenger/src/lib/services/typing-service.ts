import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface TypingUser {
    userId: string;
    isTyping: boolean;
    lastTypingAt: number;
}

export class TypingService {
    private channels: Map<string, RealtimeChannel> = new Map();
    private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private readonly TYPING_TIMEOUT = 3000; // 3 seconds

    /**
     * Subscribe to typing indicators for a conversation
     */
    subscribeToTyping(
        conversationId: string,
        currentUserId: string,
        onTypingChange: (typingUsers: TypingUser[]) => void
    ): () => void {
        // Create or get existing channel
        const channelName = `conversation:${conversationId}`;
        let channel = this.channels.get(channelName);

        if (!channel) {
            channel = supabase.channel(channelName, {
                config: {
                    presence: {
                        key: currentUserId,
                    },
                },
            });

            // Track presence state
            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel!.presenceState();
                    const typingUsers = this.extractTypingUsers(state, currentUserId);
                    onTypingChange(typingUsers);
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('User joined:', key, newPresences);
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('User left:', key, leftPresences);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        // Initialize presence as not typing
                        await channel!.track({
                            userId: currentUserId,
                            isTyping: false,
                            lastTypingAt: Date.now(),
                        });
                    }
                });

            this.channels.set(channelName, channel);
        }

        // Return unsubscribe function
        return () => {
            this.unsubscribeFromTyping(conversationId);
        };
    }

    /**
     * Broadcast typing status
     */
    async setTyping(
        conversationId: string,
        currentUserId: string,
        isTyping: boolean
    ): Promise<void> {
        const channelName = `conversation:${conversationId}`;
        const channel = this.channels.get(channelName);

        if (!channel) {
            console.warn('Channel not found for conversation:', conversationId);
            return;
        }

        // Update presence
        await channel.track({
            userId: currentUserId,
            isTyping,
            lastTypingAt: Date.now(),
        });

        // If typing, set timeout to auto-clear after 3 seconds
        if (isTyping) {
            const timeoutKey = `${conversationId}:${currentUserId}`;

            // Clear existing timeout
            const existingTimeout = this.typingTimeouts.get(timeoutKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Set new timeout
            const timeout = setTimeout(() => {
                this.setTyping(conversationId, currentUserId, false);
                this.typingTimeouts.delete(timeoutKey);
            }, this.TYPING_TIMEOUT);

            this.typingTimeouts.set(timeoutKey, timeout);
        }
    }

    /**
     * Unsubscribe from typing indicators
     */
    unsubscribeFromTyping(conversationId: string): void {
        const channelName = `conversation:${conversationId}`;
        const channel = this.channels.get(channelName);

        if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
        }

        // Clear any pending timeouts for this conversation
        for (const [key, timeout] of this.typingTimeouts.entries()) {
            if (key.startsWith(`${conversationId}:`)) {
                clearTimeout(timeout);
                this.typingTimeouts.delete(key);
            }
        }
    }

    /**
     * Extract typing users from presence state
     */
    private extractTypingUsers(
        state: Record<string, any[]>,
        currentUserId: string
    ): TypingUser[] {
        const typingUsers: TypingUser[] = [];

        for (const userId in state) {
            const presences = state[userId];
            if (presences && presences.length > 0) {
                const presence = presences[0]; // Get most recent presence
                // Exclude current user and only include actively typing users
                if (presence.userId !== currentUserId && presence.isTyping) {
                    typingUsers.push({
                        userId: presence.userId,
                        isTyping: presence.isTyping,
                        lastTypingAt: presence.lastTypingAt,
                    });
                }
            }
        }

        return typingUsers;
    }

    /**
     * Clean up all channels and timeouts
     */
    cleanup(): void {
        // Unsubscribe from all channels
        for (const [conversationId] of this.channels) {
            this.unsubscribeFromTyping(conversationId);
        }

        // Clear all timeouts
        for (const timeout of this.typingTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.typingTimeouts.clear();
    }
}

// Export singleton instance
export const typingService = new TypingService();
