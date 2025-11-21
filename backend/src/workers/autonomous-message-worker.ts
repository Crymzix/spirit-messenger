/**
 * Autonomous Message Worker
 *
 * Processes autonomous (unsolicited) bot message jobs.
 * Also includes a scheduler that periodically checks for bots that should send autonomous messages.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
    generateAutonomousBotMessage,
    getBotsWithAutonomousMessaging,
    getActiveBotConversations,
    getBotWithConfig,
} from '../services/bot-service.js';
import {
    queueBotResponse,
    queueAutonomousMessage,
    type AutonomousMessageJobData,
} from '../config/queue.js';
import { db } from '../db/client.js';
import { botAutonomousSchedules } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

/**
 * Process an autonomous message job
 */
async function processAutonomousMessage(job: Job<AutonomousMessageJobData>): Promise<void> {
    const { botUserId, conversationId } = job.data;

    console.log(`Processing autonomous message job ${job.id} for bot ${botUserId}`);

    try {
        // Generate the autonomous message
        const queuedResponse = await generateAutonomousBotMessage(botUserId, conversationId);

        if (!queuedResponse) {
            console.log(`No autonomous message generated for bot ${botUserId}`);
            return;
        }

        // Queue the message for sending (with delay for human-like timing)
        await queueBotResponse({
            botUserId: queuedResponse.botUserId,
            conversationId: queuedResponse.conversationId,
            content: queuedResponse.content,
            emoticons: queuedResponse.emoticons,
            typingDuration: queuedResponse.typingDuration,
            shouldNudge: queuedResponse.shouldNudge,
        }, queuedResponse.delay);

        console.log(`Autonomous message queued for bot ${botUserId}`);
    } catch (error) {
        console.error(`Autonomous message job ${job.id} failed:`, error);
        throw error;
    }
}

/**
 * Create and start the autonomous message worker
 */
export function createAutonomousMessageWorker(): Worker<AutonomousMessageJobData> {
    const worker = new Worker<AutonomousMessageJobData>(
        'autonomous-messages',
        processAutonomousMessage,
        {
            connection: redisConnection,
            concurrency: 50, // Process up to 50 jobs concurrently
        }
    );

    worker.on('completed', (job) => {
        console.log(`✅ Autonomous job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
        console.error(`❌ Autonomous job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('Autonomous worker error:', error);
    });

    console.log('🤖 Autonomous message worker started');
    return worker;
}

/**
 * Scheduler that periodically checks for bots that should send autonomous messages
 */
export async function runAutonomousMessageScheduler(): Promise<void> {
    console.log('🕐 Running autonomous message scheduler');

    try {
        // Get all bots with autonomous messaging enabled
        const bots = await getBotsWithAutonomousMessaging();

        for (const bot of bots) {
            // Get the bot's autonomous schedule
            const [schedule] = await db
                .select()
                .from(botAutonomousSchedules)
                .where(eq(botAutonomousSchedules.botUserId, bot.user.id))
                .limit(1);

            const lastMessageTime = schedule?.lastAutonomousMessageAt?.getTime() || 0;
            const timeSinceLast = Date.now() - lastMessageTime;

            // Check if enough time has passed since last autonomous message
            const minInterval = bot.config.autonomousIntervalMin || 300000; // 5 min default
            const maxInterval = bot.config.autonomousIntervalMax || 3600000; // 60 min default

            if (timeSinceLast < minInterval) {
                continue; // Too soon
            }

            // Calculate probability based on time elapsed
            // Probability increases as we approach maxInterval
            const probability = Math.min(
                (timeSinceLast - minInterval) / (maxInterval - minInterval),
                0.5 // Max 50% chance per check
            );

            if (Math.random() > probability) {
                continue; // Skip this time
            }

            // Get active conversations for this bot
            const conversations = await getActiveBotConversations(bot.user.id);

            if (conversations.length === 0) {
                continue; // No active conversations
            }

            // Select a random conversation (weighted by recency)
            const selectedConversation = selectConversation(conversations);

            if (!selectedConversation) {
                continue;
            }

            // Queue the autonomous message job
            await queueAutonomousMessage({
                botUserId: bot.user.id,
                conversationId: selectedConversation.conversationId,
            });

            console.log(`Scheduled autonomous message for bot ${bot.user.username} in conversation ${selectedConversation.conversationId}`);
        }
    } catch (error) {
        console.error('Autonomous message scheduler error:', error);
    }
}

/**
 * Select a conversation for autonomous messaging
 * Prefers conversations with recent activity but not too recent
 */
function selectConversation(
    conversations: Array<{ conversationId: string; lastMessageAt: Date | null }>
): { conversationId: string; lastMessageAt: Date | null } | null {
    if (conversations.length === 0) return null;

    // Filter out conversations with very recent messages (< 5 min)
    // to avoid being too eager
    const now = Date.now();
    const eligibleConversations = conversations.filter(conv => {
        if (!conv.lastMessageAt) return true; // New conversations are ok
        const timeSince = now - conv.lastMessageAt.getTime();
        return timeSince > 300000; // At least 5 minutes since last message
    });

    if (eligibleConversations.length === 0) {
        return null; // All conversations are too recent
    }

    // Randomly select from eligible conversations
    const randomIndex = Math.floor(Math.random() * eligibleConversations.length);
    return eligibleConversations[randomIndex];
}

/**
 * Start the scheduler interval
 */
export function startAutonomousMessageScheduler(intervalMs: number = 30000): NodeJS.Timeout {
    console.log(`🕐 Starting autonomous message scheduler (interval: ${intervalMs}ms)`);

    // Run immediately
    runAutonomousMessageScheduler();

    // Then run at intervals
    return setInterval(runAutonomousMessageScheduler, intervalMs);
}

export { redisConnection };
