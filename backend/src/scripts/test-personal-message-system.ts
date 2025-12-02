/**
 * Test Script: Personal Message System
 *
 * Test mood calculation and personal message generation for a specific bot.
 * Usage: tsx backend/src/scripts/test-personal-message-system.ts <botUserId>
 */

import 'dotenv/config';
import { db } from '../db/client.js';
import { users, botConfigs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getPersonalityTemplate } from '../services/personality-service.js';
import {
    calculateBotMood,
    aggregateBotConversationContext,
    generatePersonalMessage,
    shouldUpdatePersonalMessage,
    updateBotPersonalMessage,
} from '../services/personal-message-service.js';

async function testPersonalMessageSystem(): Promise<void> {
    const botUserId = process.argv[2];

    if (!botUserId) {
        console.error('Usage: tsx test-personal-message-system.ts <botUserId>');
        process.exit(1);
    }

    console.log(`\n🧪 Testing Personal Message System for bot: ${botUserId}\n`);

    try {
        // Verify bot exists
        const bot = await db.select().from(users).where(eq(users.id, botUserId)).limit(1);

        if (bot.length === 0) {
            console.error(`❌ Bot not found: ${botUserId}`);
            process.exit(1);
        }

        if (!bot[0].isAiBot) {
            console.error(`❌ User is not an AI bot: ${botUserId}`);
            process.exit(1);
        }

        const botUser = bot[0];

        // Get bot config to get personality
        const botConfig = await db
            .select()
            .from(botConfigs)
            .where(eq(botConfigs.userId, botUserId))
            .limit(1);

        if (botConfig.length === 0 || !botConfig[0].personalityTemplate) {
            console.error('❌ Bot has no personality template assigned');
            process.exit(1);
        }

        console.log(`✓ Bot found: ${botUser.displayName} (${botConfig[0].personalityTemplate})`);
        console.log(`  Current personal message: "${botUser.personalMessage || '(empty)'}"`);
        console.log('');

        // Test 1: Get personality
        console.log('📋 Test 1: Loading personality template...');
        const personality = getPersonalityTemplate(botConfig[0].personalityTemplate);
        if (!personality) {
            console.error(`❌ Personality template not found: ${botConfig[0].personalityTemplate}`);
            process.exit(1);
        }


        console.log(`✓ Personality: ${personality.name}`);
        console.log(`  Warmth: ${personality.traits.warmth}, Humor: ${personality.traits.humor}, Formality: ${personality.traits.formality}`);
        console.log('');

        // Test 2: Calculate mood
        console.log('😊 Test 2: Calculating mood...');
        const mood = await calculateBotMood(botUserId);
        console.log(`✓ Mood Score: ${mood.score.toFixed(1)}/10`);
        console.log(`  State: ${mood.state}`);
        console.log(`  Interpretation: ${mood.interpretation}`);
        console.log('');

        // Test 3: Aggregate context
        console.log('📊 Test 3: Aggregating conversation context...');
        const context = await aggregateBotConversationContext(botUserId);
        console.log(`✓ Context aggregated`);
        console.log(`  Recent interactions: ${context.recentInteractions}`);
        console.log(`  Active conversations: ${context.activeConversations}`);
        console.log(`  Hours since last interaction: ${context.hoursSinceLastInteraction.toFixed(1)}`);
        console.log(`  Average engagement score: ${context.avgEngagementScore.toFixed(1)}/10`);
        console.log(`  Summary: ${context.contextSummary}`);
        console.log('');

        // Test 4: Generate personal message
        console.log('✍️ Test 4: Generating personal message variants...');
        const messages = [];
        for (let i = 0; i < 3; i++) {
            const generatedMessage = await generatePersonalMessage(botUserId, mood, personality);
            if (generatedMessage) {
                messages.push(generatedMessage);
                console.log(`  [${i + 1}] "${generatedMessage}" (${generatedMessage.length} chars)`);
            }
        }
        if (messages.length === 0) {
            console.log('  ❌ Failed to generate messages');
        }
        console.log('');

        // Test 5: Check update conditions
        console.log('⏰ Test 5: Checking update conditions...');
        const shouldUpdate = await shouldUpdatePersonalMessage(
            botUserId,
            botUser.personalMessage,
            botUser.updatedAt,
            mood
        );
        console.log(`✓ Should update: ${shouldUpdate ? 'YES' : 'NO'}`);
        if (!shouldUpdate) {
            console.log('  Reason: Update conditions not met (within min interval or mood unchanged)');
        }
        console.log('');

        // Test 6: Full update flow (dry run)
        console.log('🚀 Test 6: Testing full update flow (dry run - not actually updating)...');
        const result = await updateBotPersonalMessage(botUserId);
        console.log(`✓ Update flow result:`);
        console.log(`  Updated: ${result.updated}`);
        console.log(`  Old message: "${result.oldMessage || '(empty)'}"`);
        console.log(`  New message: "${result.newMessage || '(none generated)'}"`);
        console.log(`  Mood score: ${result.moodScore.toFixed(1)}/10`);
        console.log(`  Mood state: ${result.moodState}`);
        console.log(`  Reason: ${result.reason}`);
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
        console.log('');

        // Summary
        console.log('✅ Test complete!\n');
        console.log('Summary:');
        console.log(`- Personality: ${personality.name}`);
        console.log(`- Current mood: ${mood.score.toFixed(1)}/10 (${mood.state})`);
        console.log(`- Active conversations: ${context.activeConversations}`);
        console.log(`- Would update: ${result.updated ? 'YES' : 'NO'}`);

        if (result.updated && result.newMessage) {
            console.log(`\nGenerated message: "${result.newMessage}"`);
            console.log('To apply this update, run: npm run workers');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testPersonalMessageSystem();
