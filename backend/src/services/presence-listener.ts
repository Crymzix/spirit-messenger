/**
 * Presence Listener Service
 *
 * Listens to Supabase Presence channel for user disconnects and automatically
 * sets users offline. Uses Redis distributed locking to ensure only one backend
 * instance processes each disconnect event (for horizontal scaling).
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';

let presenceChannel: RealtimeChannel | null = null;

/**
 * Start the presence listener
 * Subscribes to the presence:online channel and handles user disconnects
 */
export async function startPresenceListener(): Promise<void> {

    // Subscribe to the same presence channel that clients use
    presenceChannel = supabase.channel('presence:online');

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel?.presenceState();
            console.log('📡 Presence sync, tracking', Object.keys(state || {}).length, 'users');
        })
        .on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
            // key is the userId that left
            console.log(`👋 User left presence: ${key}`, leftPresences);

            // Wait a bit for potential reconnection (e.g., during status change)
            // This prevents setting offline during normal track() updates
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check if user has rejoined the presence channel
            const currentState = presenceChannel?.presenceState();
            if (currentState && currentState[key] && currentState[key].length > 0) {
                console.log(`⏭️ User ${key} has rejoined, skipping offline update`);
                return;
            }

            // Dynamically import to avoid loading before env is ready
            const { redisConnection } = await import('../config/queue.js');
            const { updateUserPresence, getUserById } = await import('./user-service.js');

            // Try to acquire distributed lock to handle this disconnect
            // This prevents multiple backend instances from processing the same event
            const lockKey = `presence:offline:${key}`;
            const lockAcquired = await redisConnection.set(lockKey, '1', 'EX', 10, 'NX');

            if (lockAcquired) {
                try {
                    // Double-check user is still not in presence after acquiring lock
                    const recheckState = presenceChannel?.presenceState();
                    if (recheckState && recheckState[key] && recheckState[key].length > 0) {
                        console.log(`⏭️ User ${key} rejoined during lock acquisition, skipping`);
                        return;
                    }

                    // Check current user status before setting offline
                    const user = await getUserById(key);
                    if (!user) {
                        console.log(`⚠️ User ${key} not found, skipping offline update`);
                        return;
                    }

                    if (user.presenceStatus === 'offline') {
                        console.log(`⏭️ User ${key} already offline, skipping`);
                        return;
                    }

                    console.log(`🔒 Acquired lock for ${key}, setting offline (was: ${user.presenceStatus})`);
                    await updateUserPresence(key, { presenceStatus: 'offline' });
                    console.log(`✅ Set user ${key} to offline`);
                } catch (error) {
                    console.error(`❌ Failed to set user ${key} offline:`, error);
                }
            } else {
                console.log(`⏭️ Lock not acquired for ${key}, another instance is handling`);
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('✅ Presence listener subscribed to presence:online channel');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Presence listener channel error');
            }
        });
}

/**
 * Stop the presence listener
 * Cleans up the Supabase channel subscription
 */
export async function stopPresenceListener(): Promise<void> {
    if (presenceChannel) {
        await presenceChannel.unsubscribe();
        presenceChannel = null;
        console.log('🛑 Presence listener stopped');
    }
}
