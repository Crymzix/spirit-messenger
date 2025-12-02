/**
 * Personal Message Worker
 *
 * Periodic scheduler that updates bot personal messages based on mood
 * and conversation engagement patterns.
 */

import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { updateBotPersonalMessage } from '../services/personal-message-service.js';

let personalMessageScheduler: NodeJS.Timeout | null = null;

/**
 * Start the personal message scheduler
 * Runs every 2 hours to check if bots need personal message updates
 */
export function startPersonalMessageScheduler(intervalMs: number = 7200000): void {
    if (!process.env.ENABLE_PERSONAL_MESSAGE_AUTO_UPDATE || process.env.ENABLE_PERSONAL_MESSAGE_AUTO_UPDATE !== 'true') {
        console.log('[PersonalMessage] Personal message auto-update is disabled');
        return;
    }

    console.log(`[PersonalMessage] Starting personal message scheduler (interval: ${intervalMs}ms)`);

    // Run immediately on startup
    processAllBots().catch((error) => {
        console.error('[PersonalMessage] Failed to process bots on startup:', error);
    });

    // Then run periodically
    personalMessageScheduler = setInterval(() => {
        processAllBots().catch((error) => {
            console.error('[PersonalMessage] Failed to process bots in scheduler:', error);
        });
    }, intervalMs);
}

/**
 * Stop the personal message scheduler
 */
export function stopPersonalMessageScheduler(): void {
    if (personalMessageScheduler) {
        clearInterval(personalMessageScheduler);
        personalMessageScheduler = null;
        console.log('[PersonalMessage] Personal message scheduler stopped');
    }
}

/**
 * Process all bots that should have their personal messages updated
 */
async function processAllBots(): Promise<void> {
    try {
        // Fetch all AI bots
        const bots = await db.select().from(users).where(eq(users.isAiBot, true));

        if (bots.length === 0) {
            console.log('[PersonalMessage] No AI bots found');
            return;
        }

        console.log(`[PersonalMessage] Processing ${bots.length} AI bots for personal message updates`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        // Process each bot sequentially to avoid overwhelming the system
        for (const bot of bots) {
            try {
                const result = await updateBotPersonalMessage(bot.id);

                if (result.updated) {
                    successCount++;
                    console.log(
                        `[PersonalMessage] ✓ Updated ${bot.displayName}: "${result.newMessage}" (mood: ${result.moodScore.toFixed(1)})`
                    );
                } else {
                    skipCount++;
                    if (result.error) {
                        console.log(`[PersonalMessage] ! Skipped ${bot.displayName}: ${result.reason}`);
                    }
                }
            } catch (error) {
                errorCount++;
                console.error(`[PersonalMessage] ✗ Error updating ${bot.displayName}:`, error);
            }
        }

        console.log(
            `[PersonalMessage] Batch complete: ${successCount} updated, ${skipCount} skipped, ${errorCount} errors`
        );
    } catch (error) {
        console.error('[PersonalMessage] Failed to process bots:', error);
    }
}

export default {
    startPersonalMessageScheduler,
    stopPersonalMessageScheduler,
};
