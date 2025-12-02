/**
 * Worker Entry Point
 *
 * Starts all bot workers and the autonomous message scheduler.
 * Run with: npm run workers
 */

import 'dotenv/config';
import { createBotResponseWorker } from './bot-response-worker.js';
import {
    createAutonomousMessageWorker,
    startAutonomousMessageScheduler,
} from './autonomous-message-worker.js';
import { startPersonalMessageScheduler, stopPersonalMessageScheduler } from './personal-message-worker.js';
import { closeQueues } from '../config/queue.js';

console.log('🚀 Starting bot workers...');

// Create workers
const botResponseWorker = createBotResponseWorker();
const autonomousMessageWorker = createAutonomousMessageWorker();

// Start the autonomous message scheduler (runs 30 seconds)
const schedulerInterval = startAutonomousMessageScheduler(30000);

// Start the personal message scheduler (runs every 2 hours)
const personalMessageCheckIntervalMs = parseInt(
    process.env.PERSONAL_MESSAGE_CHECK_INTERVAL_MS || '7200000',
    10
);
startPersonalMessageScheduler(personalMessageCheckIntervalMs);

// Graceful shutdown
async function shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down workers...');

    // Stop schedulers
    clearInterval(schedulerInterval);
    stopPersonalMessageScheduler();

    // Close workers
    await botResponseWorker.close();
    await autonomousMessageWorker.close();

    // Close queues
    await closeQueues();

    console.log('✅ Workers shut down successfully');
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('✅ All workers started and running');
console.log('Press Ctrl+C to stop');
