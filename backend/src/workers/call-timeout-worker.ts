/**
 * Call Timeout Worker
 *
 * Processes call timeout jobs from the queue.
 * Marks calls as missed if they haven't been answered after 30 seconds.
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { calls, messages, conversationParticipants } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { CallTimeoutJobData } from '../config/queue.js';

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

/**
 * Process a call timeout job
 * Marks call as missed if it's still in ringing state
 */
async function processCallTimeout(job: Job<CallTimeoutJobData>): Promise<void> {
    const { callId, conversationId, initiatorId, callType } = job.data;

    console.log(`Processing call timeout for call ${callId}`);

    try {
        // Lazy load database to ensure env vars are loaded
        const { db } = await import('../db/client.js');

        // Check if call is still in ringing state
        const [call] = await db
            .select()
            .from(calls)
            .where(eq(calls.id, callId))
            .limit(1);

        if (!call) {
            console.log(`Call ${callId} not found, skipping timeout`);
            return;
        }

        // Only mark as missed if still ringing
        if (call.status !== 'ringing') {
            console.log(`Call ${callId} is already ${call.status}, skipping timeout`);
            return;
        }

        // Mark call as missed
        const now = new Date();
        const [updatedCall] = await db
            .update(calls)
            .set({
                status: 'missed',
                endedAt: now,
                updatedAt: now,
            })
            .where(eq(calls.id, callId))
            .returning();

        if (!updatedCall) {
            console.error(`Failed to update call ${callId} to missed status`);
            return;
        }

        console.log(`Call ${callId} marked as missed`);

        // Create system message for missed call
        const systemMessage = {
            conversationId,
            senderId: initiatorId,
            content: `Missed ${callType === 'voice' ? 'voice' : 'video'} call`,
            messageType: 'system',
            metadata: {
                callId,
                callType,
                status: 'missed',
            },
        };

        try {
            await db
                .insert(messages)
                .values(systemMessage);

            console.log(`Created system message for missed call ${callId}`);
        } catch (dbError) {
            console.error('Error creating missed call system message:', dbError);
            // Continue - this is not critical
        }

        // Get participants for notification
        const participants = await db
            .select()
            .from(conversationParticipants)
            .where(eq(conversationParticipants.conversationId, conversationId));

        // Publish call_missed event via Supabase Realtime
        const participantUserIds = participants
            .filter(p => p.leftAt === null)
            .map(p => p.userId);

        if (participantUserIds.length > 0) {
            try {
                const { realtimePublisher } = await import('../lib/realtime-publisher.js');

                await realtimePublisher.publishCallMissed(participantUserIds, {
                    callId,
                    conversationId,
                });

                console.log(`Published call_missed event for call ${callId}`);
            } catch (publishError) {
                console.error('Error publishing call_missed event:', publishError);
            }
        }

        console.log(`Call timeout job ${job.id} completed successfully`);
    } catch (error) {
        console.error(`Call timeout job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger retry
    }
}

/**
 * Create and start the worker
 */
export function createCallTimeoutWorker(): Worker<CallTimeoutJobData> {
    const worker = new Worker<CallTimeoutJobData>(
        'call-timeouts',
        processCallTimeout,
        {
            connection: redisConnection,
            concurrency: 10, // Process up to 10 timeout jobs in parallel
        }
    );

    worker.on('completed', (job) => {
        console.log(`✅ Call timeout job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
        console.error(`❌ Call timeout job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('Call timeout worker error:', error);
    });

    console.log('⏱️ Call timeout worker started');
    return worker;
}

// Export for direct execution
export { processCallTimeout, redisConnection };
