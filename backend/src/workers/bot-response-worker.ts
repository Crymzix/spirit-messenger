/**
 * Bot Response Worker
 *
 * Processes delayed bot response jobs from the queue.
 * Handles typing indicators, nudges, and message sending.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import {
    sendBotMessage,
    sendBotNudge,
} from '../services/bot-service.js';
import type { BotResponseJobData } from '../config/queue.js';

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

// Supabase client for typing indicators
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send typing indicator via Supabase Realtime
 */
async function setTypingIndicator(
    botUserId: string,
    conversationId: string,
    isTyping: boolean
): Promise<void> {
    try {
        const channel = supabase.channel(`conversation:${conversationId}`, {
            config: {
                presence: { key: botUserId },
            },
        });

        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    odUserId: botUserId,
                    isTyping,
                    lastTypingAt: Date.now(),
                });

                // Unsubscribe after a short delay to clean up
                setTimeout(() => {
                    supabase.removeChannel(channel);
                }, 1000);
            }
        });
    } catch (error) {
        console.error('Failed to set typing indicator:', error);
        // Non-critical, continue with message sending
    }
}

/**
 * Process a bot response job
 */
async function processBotResponse(job: Job<BotResponseJobData>): Promise<void> {
    const {
        botUserId,
        conversationId,
        content,
        emoticons,
        typingDuration,
        shouldNudge,
    } = job.data;

    console.log(`Processing bot response job ${job.id} for bot ${botUserId}`);

    try {
        // 1. Send nudge first if needed (before typing)
        if (shouldNudge) {
            console.log(`Bot ${botUserId} sending nudge`);
            await sendBotNudge(botUserId, conversationId);
            await sleep(1500); // Brief pause after nudge
        }

        // 2. Start typing indicator
        await setTypingIndicator(botUserId, conversationId, true);

        // 3. Wait for typing duration (simulates human typing)
        await sleep(typingDuration);

        // 4. Send the message
        const message = await sendBotMessage(botUserId, conversationId, content, emoticons);
        console.log(`Bot ${botUserId} sent message: ${message.id}`);

        // 5. Stop typing indicator
        await setTypingIndicator(botUserId, conversationId, false);

        console.log(`Bot response job ${job.id} completed successfully`);
    } catch (error) {
        console.error(`Bot response job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger retry
    }
}

/**
 * Create and start the worker
 */
export function createBotResponseWorker(): Worker<BotResponseJobData> {
    const worker = new Worker<BotResponseJobData>(
        'bot-responses',
        processBotResponse,
        {
            connection: redisConnection,
            concurrency: 100, // Process up to 100 jobs concurrently
            limiter: {
                max: 1000, // Max 1000 jobs per minute
                duration: 60000,
            },
        }
    );

    worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
        console.error(`❌ Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('Worker error:', error);
    });

    console.log('🤖 Bot response worker started');
    return worker;
}

// Export for direct execution
export { processBotResponse, redisConnection };
