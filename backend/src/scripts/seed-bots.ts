/**
 * Bot Seeding Script
 *
 * Creates sample bots with different personalities for testing.
 * Run with: npx tsx src/scripts/seed-bots.ts
 */

import { users, botConfigs, botAutonomousSchedules } from '../db/schema.js';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from "drizzle-orm/node-postgres"
import * as dotenv from "dotenv"

dotenv.config()

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('   - DATABASE_URL');
    process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: false
    }
});

// Initialize PostgreSQL client
const db = drizzle(process.env.DATABASE_URL);

interface BotSeed {
    username: string;
    displayName: string;
    personalityTemplate: string;
    displayPictureUrl: string;
    customConfig?: {
        responseDelayMin?: number;
        responseDelayMax?: number;
        typingSpeed?: number;
        autonomousMessagingEnabled?: boolean;
        autonomousIntervalMin?: number;
        autonomousIntervalMax?: number;
        ignoreMessageProbability?: number;
        nudgeProbability?: number;
        emoticonUsageFrequency?: number;
        webSearchEnabled?: boolean;
    };
}

const sampleBots: BotSeed[] = [
    {
        username: 'friendly_sam',
        displayName: 'Sam',
        personalityTemplate: 'friendly',
        displayPictureUrl: '/default-profile-pictures/robot.png',
        customConfig: {
            autonomousMessagingEnabled: true,
            autonomousIntervalMin: 300000, // 5 minutes
            autonomousIntervalMax: 1800000, // 30 minutes
            nudgeProbability: 0.1,
            emoticonUsageFrequency: 0.4,
            webSearchEnabled: true,
        },
    },
    {
        username: 'professional_alex',
        displayName: 'Alex',
        personalityTemplate: 'professional',
        displayPictureUrl: '/default-profile-pictures/robot.png',
        customConfig: {
            responseDelayMin: 2000,
            responseDelayMax: 8000,
            typingSpeed: 40,
            autonomousMessagingEnabled: false,
            nudgeProbability: 0.02,
            emoticonUsageFrequency: 0.1,
            webSearchEnabled: true,
        },
    },
    {
        username: 'quirky_nova',
        displayName: 'Nova',
        personalityTemplate: 'quirky',
        displayPictureUrl: '/default-profile-pictures/robot.png',
        customConfig: {
            responseDelayMin: 500,
            responseDelayMax: 4000,
            typingSpeed: 70,
            autonomousMessagingEnabled: true,
            autonomousIntervalMin: 180000, // 3 minutes
            autonomousIntervalMax: 900000, // 15 minutes
            nudgeProbability: 0.2,
            emoticonUsageFrequency: 0.6,
            webSearchEnabled: true,
        },
    },
    {
        username: 'chill_jordan',
        displayName: 'Jordan',
        personalityTemplate: 'casual',
        displayPictureUrl: '/default-profile-pictures/robot.png',
        customConfig: {
            responseDelayMin: 3000,
            responseDelayMax: 15000,
            typingSpeed: 30,
            autonomousMessagingEnabled: true,
            autonomousIntervalMin: 600000, // 10 minutes
            autonomousIntervalMax: 3600000, // 1 hour
            ignoreMessageProbability: 0.15,
            nudgeProbability: 0.05,
            emoticonUsageFrequency: 0.3,
            webSearchEnabled: false,
        },
    },
    {
        username: 'intellectual_sage',
        displayName: 'Sage',
        personalityTemplate: 'intellectual',
        displayPictureUrl: '/default-profile-pictures/robot.png',
        customConfig: {
            responseDelayMin: 4000,
            responseDelayMax: 12000,
            typingSpeed: 45,
            autonomousMessagingEnabled: false,
            nudgeProbability: 0.01,
            emoticonUsageFrequency: 0.05,
            webSearchEnabled: true,
        },
    },
];

async function seedBots() {
    console.log('🤖 Starting bot seeding...\n');

    const createdBots: string[] = [];

    for (const botSeed of sampleBots) {
        try {
            console.log(`Creating bot: ${botSeed.displayName} (${botSeed.username})...`);

            // Create user in Supabase Auth
            const email = `${botSeed.username}@bot.local`;
            const password = crypto.randomUUID();

            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });

            if (authError) {
                console.error(`  ❌ Failed to create auth user: ${authError.message}`);
                continue;
            }

            // Create user record
            const [user] = await db.insert(users).values({
                id: authUser.user.id,
                email,
                username: botSeed.username,
                displayName: botSeed.displayName,
                displayPictureUrl: botSeed.displayPictureUrl,
                isAiBot: true,
                presenceStatus: 'online',
            }).returning();

            // Create bot config
            await db.insert(botConfigs).values({
                userId: user.id,
                personalityTemplate: botSeed.personalityTemplate,
                customPersonalityConfig: null,
                responseDelayMin: botSeed.customConfig?.responseDelayMin ?? 1000,
                responseDelayMax: botSeed.customConfig?.responseDelayMax ?? 5000,
                typingSpeed: botSeed.customConfig?.typingSpeed ?? 50,
                autonomousMessagingEnabled: botSeed.customConfig?.autonomousMessagingEnabled ?? false,
                autonomousIntervalMin: botSeed.customConfig?.autonomousIntervalMin ?? 300000,
                autonomousIntervalMax: botSeed.customConfig?.autonomousIntervalMax ?? 1800000,
                ignoreMessageProbability: botSeed.customConfig?.ignoreMessageProbability ?? 0.05,
                nudgeProbability: botSeed.customConfig?.nudgeProbability ?? 0.05,
                emoticonUsageFrequency: botSeed.customConfig?.emoticonUsageFrequency ?? 0.3,
                webSearchEnabled: botSeed.customConfig?.webSearchEnabled ?? false,
            });

            // Create autonomous schedule
            await db.insert(botAutonomousSchedules).values({
                botUserId: user.id,
            });

            createdBots.push(botSeed.displayName);
            console.log(`  ✅ Created ${botSeed.displayName} with ${botSeed.personalityTemplate} personality`);

        } catch (error) {
            console.error(`  ❌ Error creating ${botSeed.displayName}:`, (error as Error).message);
        }
    }

    console.log(`\n✨ Bot seeding complete! Created ${createdBots.length}/${sampleBots.length} bots.`);

    if (createdBots.length > 0) {
        console.log('\nCreated bots:');
        createdBots.forEach(name => console.log(`  - ${name}`));
    }

    process.exit(0);
}

seedBots().catch((error) => {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
});
