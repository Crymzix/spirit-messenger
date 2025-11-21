/**
 * BullMQ Queue Configuration
 *
 * Sets up queues and Redis connection for bot message processing.
 * Supports both local Redis and Upstash Redis (via REDIS_URL env var).
 */

import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection - supports local or Upstash
// Local: redis://localhost:6379
// Upstash: rediss://... (with TLS)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
});

// Log connection status
redisConnection.on('connect', () => {
    console.log(`✅ Connected to Redis: ${redisUrl.includes('upstash') ? 'Upstash' : 'Local'}`);
});

redisConnection.on('error', (error) => {
    console.error('❌ Redis connection error:', error.message);
});

/**
 * Queue for bot response messages
 * Handles delayed responses with human-like timing
 */
export const botResponseQueue = new Queue('bot-responses', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            count: 1000, // Keep last 1000 completed jobs
            age: 3600, // Remove jobs older than 1 hour
        },
        removeOnFail: {
            count: 500, // Keep last 500 failed jobs for debugging
        },
    },
});

/**
 * Queue for autonomous bot messages
 * Handles unsolicited messages from bots
 */
export const autonomousMessageQueue = new Queue('autonomous-messages', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 5000,
        },
        removeOnComplete: {
            count: 500,
            age: 3600,
        },
        removeOnFail: {
            count: 100,
        },
    },
});

/**
 * Queue events for monitoring
 */
export const botResponseQueueEvents = new QueueEvents('bot-responses', {
    connection: redisConnection,
});

export const autonomousMessageQueueEvents = new QueueEvents('autonomous-messages', {
    connection: redisConnection,
});

// Set up event listeners for monitoring
botResponseQueueEvents.on('completed', ({ jobId }) => {
    console.log(`Bot response job ${jobId} completed`);
});

botResponseQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`Bot response job ${jobId} failed: ${failedReason}`);
});

autonomousMessageQueueEvents.on('completed', ({ jobId }) => {
    console.log(`Autonomous message job ${jobId} completed`);
});

autonomousMessageQueueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`Autonomous message job ${jobId} failed: ${failedReason}`);
});

/**
 * Job data types
 */
export interface BotResponseJobData {
    botUserId: string;
    conversationId: string;
    content: string;
    emoticons: string[];
    typingDuration: number;
    shouldNudge: boolean;
}

export interface AutonomousMessageJobData {
    botUserId: string;
    conversationId: string;
}

/**
 * Add a bot response job to the queue
 */
export async function queueBotResponse(
    data: BotResponseJobData,
    delay: number
): Promise<string> {
    const job = await botResponseQueue.add('send-response', data, {
        delay, // Delay in milliseconds before processing
        jobId: `bot-response-${data.botUserId}-${Date.now()}`,
    });

    console.log(`Queued bot response job ${job.id} with ${delay}ms delay`);
    return job.id || '';
}

/**
 * Add an autonomous message job to the queue
 */
export async function queueAutonomousMessage(
    data: AutonomousMessageJobData,
    delay: number = 0
): Promise<string> {
    const job = await autonomousMessageQueue.add('send-autonomous', data, {
        delay,
        jobId: `autonomous-${data.botUserId}-${data.conversationId}-${Date.now()}`,
    });

    console.log(`Queued autonomous message job ${job.id}`);
    return job.id || '';
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
    botResponses: { waiting: number; active: number; completed: number; failed: number };
    autonomousMessages: { waiting: number; active: number; completed: number; failed: number };
}> {
    const [brWaiting, brActive, brCompleted, brFailed] = await Promise.all([
        botResponseQueue.getWaitingCount(),
        botResponseQueue.getActiveCount(),
        botResponseQueue.getCompletedCount(),
        botResponseQueue.getFailedCount(),
    ]);

    const [amWaiting, amActive, amCompleted, amFailed] = await Promise.all([
        autonomousMessageQueue.getWaitingCount(),
        autonomousMessageQueue.getActiveCount(),
        autonomousMessageQueue.getCompletedCount(),
        autonomousMessageQueue.getFailedCount(),
    ]);

    return {
        botResponses: {
            waiting: brWaiting,
            active: brActive,
            completed: brCompleted,
            failed: brFailed,
        },
        autonomousMessages: {
            waiting: amWaiting,
            active: amActive,
            completed: amCompleted,
            failed: amFailed,
        },
    };
}

/**
 * Graceful shutdown
 */
export async function closeQueues(): Promise<void> {
    await botResponseQueue.close();
    await autonomousMessageQueue.close();
    await botResponseQueueEvents.close();
    await autonomousMessageQueueEvents.close();
    await redisConnection.quit();
    console.log('All queues closed');
}

export { redisConnection };
