/**
 * Presence Listener Service
 *
 * Listens to Supabase Presence channel for user disconnects and automatically
 * sets users offline. Uses Redis distributed locking to ensure only one backend
 * instance processes each disconnect event (for horizontal scaling).
 */

import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

let presenceChannel: RealtimeChannel | null = null;

/**
 * Start the presence listener
 * Subscribes to the presence:online channel and handles user disconnects
 */
export async function startPresenceListener(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for presence listener');
        return;
    }

    // Create a Supabase client with service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Subscribe to the same presence channel that clients use
    presenceChannel = supabase.channel('presence:online');

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel?.presenceState();
            console.log('📡 Presence sync, tracking', Object.keys(state || {}).length, 'users');
        })
        .on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
            // key is the userId that left
            console.log(`👋 User left presence: ${key}`);

            // Dynamically import to avoid loading before env is ready
            const { redisConnection } = await import('../config/queue.js');
            const { updateUserPresence } = await import('./user-service.js');

            // Try to acquire distributed lock to handle this disconnect
            // This prevents multiple backend instances from processing the same event
            const lockKey = `presence:offline:${key}`;
            const lockAcquired = await redisConnection.set(lockKey, '1', 'EX', 10, 'NX');

            if (lockAcquired) {
                try {
                    console.log(`🔒 Acquired lock for ${key}, setting offline`);
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
