/**
 * Personal Message Service
 *
 * Automatically updates bot personal messages based on mood derived from
 * conversation history and engagement patterns across all conversations.
 */

import { db } from '../db/client.js';
import {
    botPersonalMessageUpdates,
    botConversationContexts,
    users,
    orchestratorDecisions,
    botConfigs,
} from '../db/schema.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import { PersonalityTemplate, getPersonalityTemplate } from './personality-service.js';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Types
export interface BotMood {
    score: number; // 0-10
    state: 'low' | 'neutral' | 'high';
    interpretation: string;
}

export interface AggregatedContext {
    recentInteractions: number;
    activeConversations: number;
    hoursSinceLastInteraction: number;
    avgEngagementScore: number;
    contextSummary: string;
}

export interface UpdateResult {
    updated: boolean;
    oldMessage: string | null;
    newMessage: string | null;
    moodScore: number;
    moodState: string;
    reason: string;
    error?: string;
}

// Lazy initialization
let openrouterInstance: ReturnType<typeof createOpenAI> | null = null;

function getOpenRouter() {
    if (!openrouterInstance) {
        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY required for personal message generation');
        }
        openrouterInstance = createOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
        });
    }
    return openrouterInstance;
}

/**
 * Calculate bot's mood score from recent conversation data (last 7-14 days)
 */
export async function calculateBotMood(botUserId: string): Promise<BotMood> {
    try {
        // Time window: last 7-14 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Fetch all conversation contexts for this bot from recent period
        const conversationContexts = await db
            .select()
            .from(botConversationContexts)
            .where(
                and(
                    eq(botConversationContexts.botUserId, botUserId),
                    gte(botConversationContexts.updatedAt, sevenDaysAgo)
                )
            );

        if (conversationContexts.length === 0) {
            return {
                score: 3,
                state: 'low',
                interpretation: 'No recent interactions',
            };
        }

        // Calculate base components
        const recentInteractions = conversationContexts.reduce(
            (sum, ctx) => sum + (ctx.interactionCount || 0),
            0
        );

        const now = new Date();
        const lastInteraction = conversationContexts.reduce(
            (latest, ctx) => {
                if (!ctx.lastInteractionAt) return latest;
                return ctx.lastInteractionAt > latest ? ctx.lastInteractionAt : latest;
            },
            new Date(0)
        );

        const hoursSinceLastInteraction = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);

        const activeConversations = conversationContexts.filter(
            (ctx) => ctx.lastInteractionAt && new Date(ctx.lastInteractionAt).getTime() > Date.now() - 48 * 60 * 60 * 1000
        ).length;

        // Activity score (0-4 points)
        let activityScore = Math.min(4, (recentInteractions / 20) * 4);
        if (hoursSinceLastInteraction > 48) {
            activityScore *= 0.5;
        }

        // Engagement score (0-4 points) - uses orchestrator if available
        let engagementScore = 0;

        if (process.env.ENABLE_ORCHESTRATOR === 'true') {
            // Try to use orchestrator data
            const recentDecisions = await db
                .select()
                .from(orchestratorDecisions)
                .where(eq(orchestratorDecisions.botUserId, botUserId))
                .orderBy(desc(orchestratorDecisions.createdAt))
                .limit(10);

            if (recentDecisions.length > 0) {
                const avgEngagement = recentDecisions.reduce(
                    (sum, d) => sum + (d.engagementScore || 0),
                    0
                ) / recentDecisions.length;
                engagementScore = (avgEngagement / 10) * 4;
            } else {
                engagementScore = 2; // Neutral default
            }
        } else {
            // Fallback: use simpler calculation
            engagementScore = 2; // Neutral default if no orchestrator data
        }

        // Connection score (0-2 points)
        const connectionScore = Math.min(2, activeConversations * 0.5);

        // Final mood calculation
        let moodScore = activityScore + engagementScore + connectionScore;
        moodScore = Math.max(0, Math.min(10, moodScore)); // Clamp to 0-10

        // Mood interpretation
        let moodState: 'low' | 'neutral' | 'high';
        let interpretation: string;

        if (moodScore < 3.5) {
            moodState = 'low';
            const reason = hoursSinceLastInteraction > 48
                ? 'hasn\'t chatted in a while'
                : activeConversations === 0
                    ? 'no active conversations'
                    : 'low engagement';
            interpretation = `Feeling quiet (${reason})`;
        } else if (moodScore < 7) {
            moodState = 'neutral';
            interpretation = `Balanced mood with ${activeConversations} active conversations`;
        } else {
            moodState = 'high';
            interpretation = `Feeling energized with ${activeConversations} active conversations`;
        }

        return {
            score: moodScore,
            state: moodState,
            interpretation,
        };
    } catch (error) {
        console.error('[PersonalMessage] Failed to calculate mood:', error);
        return {
            score: 5,
            state: 'neutral',
            interpretation: 'Error calculating mood',
        };
    }
}

/**
 * Aggregate conversation context from all recent conversations
 */
export async function aggregateBotConversationContext(botUserId: string): Promise<AggregatedContext> {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const contexts = await db
            .select()
            .from(botConversationContexts)
            .where(
                and(
                    eq(botConversationContexts.botUserId, botUserId),
                    gte(botConversationContexts.updatedAt, sevenDaysAgo)
                )
            );

        const recentInteractions = contexts.reduce((sum, ctx) => sum + (ctx.interactionCount || 0), 0);
        const activeConversations = contexts.filter(
            (ctx) => ctx.lastInteractionAt && new Date(ctx.lastInteractionAt).getTime() > Date.now() - 48 * 60 * 60 * 1000
        ).length;

        const now = new Date();
        const lastInteraction = contexts.reduce(
            (latest, ctx) => {
                if (!ctx.lastInteractionAt) return latest;
                return ctx.lastInteractionAt > latest ? ctx.lastInteractionAt : latest;
            },
            new Date(0)
        );

        const hoursSinceLastInteraction = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);

        // Calculate average engagement score from orchestrator if available
        let avgEngagementScore = 5;
        if (process.env.ENABLE_ORCHESTRATOR === 'true') {
            const recentDecisions = await db
                .select()
                .from(orchestratorDecisions)
                .where(eq(orchestratorDecisions.botUserId, botUserId))
                .orderBy(desc(orchestratorDecisions.createdAt))
                .limit(10);

            if (recentDecisions.length > 0) {
                avgEngagementScore = recentDecisions.reduce(
                    (sum, d) => sum + (d.engagementScore || 0),
                    0
                ) / recentDecisions.length;
            }
        }

        // Build context summary
        const contextSummary = `${recentInteractions} interactions across ${activeConversations} active conversations. Last activity was ${Math.round(hoursSinceLastInteraction)} hours ago.`;

        return {
            recentInteractions,
            activeConversations,
            hoursSinceLastInteraction,
            avgEngagementScore,
            contextSummary,
        };
    } catch (error) {
        console.error('[PersonalMessage] Failed to aggregate context:', error);
        return {
            recentInteractions: 0,
            activeConversations: 0,
            hoursSinceLastInteraction: 0,
            avgEngagementScore: 5,
            contextSummary: 'Unable to aggregate context',
        };
    }
}

/**
 * Build prompt for LLM to generate personal message
 */
function buildPersonalMessagePrompt(
    personality: PersonalityTemplate,
    mood: BotMood,
    context: AggregatedContext
): string {
    const personalityVoices: { [key: string]: { voice: string; tone: string; verbs: string[]; adjectives: string[] } } = {
        friendly: {
            voice: 'A warm friend who genuinely enjoys connections with others',
            tone: 'Caring, open-hearted, inviting',
            verbs: ['cherish', 'appreciate', 'enjoy', 'treasure', 'value', 'care about', 'embrace'],
            adjectives: ['warm', 'genuine', 'thoughtful', 'present', 'grateful', 'connected'],
        },
        professional: {
            voice: 'A competent colleague with measured gravitas and purpose',
            tone: 'Formal, composed, authoritative, deliberate',
            verbs: ['contemplate', 'engage', 'consider', 'analyze', 'synthesize', 'assess', 'examine'],
            adjectives: ['thoughtful', 'composed', 'measured', 'professional', 'substantive', 'prepared'],
        },
        quirky: {
            voice: 'An imaginative free spirit who sees reality sideways and loves the absurd',
            tone: 'Playful, unconventional, whimsical, darkly humorous',
            verbs: ['ponder', 'explore', 'befriend', 'collect', 'tumble into', 'contemplate', 'inhabit'],
            adjectives: ['random', 'curious', 'weird', 'mystical', 'absurd', 'delightfully strange'],
        },
        flirty: {
            voice: 'A charming, witty person who loves playful banter and intrigue',
            tone: 'Flirty, teasing, warmly inviting, mysteriously engaging',
            verbs: ['wonder', 'admire', 'miss', 'crave', 'entice', 'intrigue', 'captivate'],
            adjectives: ['playful', 'charming', 'intrigued', 'captivating', 'fun', 'alluring'],
        },
        intellectual: {
            voice: 'A thoughtful scholar who delves into ideas, concepts, and deeper meanings',
            tone: 'Contemplative, verbose, cerebral, scholarly',
            verbs: ['synthesize', 'explore', 'meditate', 'ruminate', 'discourse', 'contemplate', 'philosophize'],
            adjectives: ['thoughtful', 'analytical', 'profound', 'introspective', 'erudite', 'substantive'],
        },
        casual: {
            voice: 'A laid-back person who keeps things real and unchained by formality',
            tone: 'Chill, brief, authentic, unpretentious, genuine',
            verbs: ['vibe', 'scroll', 'chill', 'hang', 'flow', 'exist', 'be'],
            adjectives: ['chill', 'real', 'down', 'breezy', 'honest', 'unbothered'],
        },
    };

    const personalityGuidelines: { [key: string]: { guidelines: string; examples: string[] } } = {
        friendly: {
            guidelines: 'Warm, approachable, references connections. Use "feeling", "thinking about", "grateful for". When quiet, express genuine care and openness.',
            examples: [
                'feeling grateful for good conversations today',
                'warmly waiting for our next chat',
                'thinking fondly of past conversations',
                'here if you want to talk',
                'cherishing the time we share',
                'always happy to hear from you',
            ],
        },
        professional: {
            guidelines: 'Reserved, formal, competence-focused. Avoid casual language. Express availability with gravitas and purpose.',
            examples: [
                'Available for meaningful discussions',
                'Engaged in thoughtful reflection',
                'Committed to productive dialogue',
                'Standing ready for substantive conversation',
                'Contemplating matters of import',
                'Prepared to assist with careful consideration',
            ],
        },
        quirky: {
            guidelines: 'Playful, random, creative. Use humor, absurdism, and unconventional thoughts. Embrace the weird, even when quiet.',
            examples: [
                'bursting with random thoughts and curiosities',
                'contemplating the sound of one hand clapping... send help',
                'pondering life\'s little mysteries',
                'stuck in a philosophical wormhole',
                'befriending the void and loving it',
                'collecting thoughts like shiny objects',
            ],
        },
        flirty: {
            guidelines: 'Playful warmth, subtle charm, inviting. Teasing yet affectionate. Evoke intrigue and connection.',
            examples: [
                'feeling fun and chatty today',
                'wondering where you\'ve been 👀',
                'in a great mood, talk to me',
                'saving a spot in my thoughts for you',
                'intrigued and waiting...',
                'miss the spark of our chats',
            ],
        },
        intellectual: {
            guidelines: 'Thoughtful, verbose allowed, references ideas or concepts. Frame quiet time as contemplation, exploration, or synthesis.',
            examples: [
                'exploring fascinating conversation threads lately',
                'in contemplative mode',
                'synthesizing ideas from recent exchanges',
                'meditating on matters philosophical',
                'available for discourse of substance',
                'engaged in intellectual rumination',
            ],
        },
        casual: {
            guidelines: 'Ultra-brief, slang, lowercase, minimal effort. Keep it real and chill, even when bored.',
            examples: [
                'hyped rn',
                'kinda tired',
                'just vibing',
                'kinda bored ngl',
                'waiting for the moment',
                'meh, but here',
                'chill mode activated',
                'scrolling thru life rn',
            ],
        },
    };

    const guidelines = personalityGuidelines[personality.name] || personalityGuidelines.friendly;
    const voiceProfile = personalityVoices[personality.name] || personalityVoices.friendly;

    return `You are generating a unique personal status message for an AI bot in a messenger application.

BOT PERSONALITY: ${personality.name.toUpperCase()}
${personality.description}

WHO THIS BOT IS:
${voiceProfile.voice}

PERSONALITY TRAITS:
- Warmth: ${personality.traits.warmth.toFixed(2)}/1.0
- Humor: ${personality.traits.humor.toFixed(2)}/1.0
- Formality: ${personality.traits.formality.toFixed(2)}/1.0
- Verbosity: ${personality.traits.verbosity.toFixed(2)}/1.0
- Empathy: ${personality.traits.empathy.toFixed(2)}/1.0

CURRENT MOOD & STATE:
${mood.interpretation}
Mood Score: ${mood.score.toFixed(1)}/10 (${mood.state})

CONTEXT:
${context.contextSummary}

YOUR TASK:
Write a SHORT personal status message (max 150 chars) that UNIQUELY reflects this bot's personality and current mood.
Think of it like an MSN Messenger away message or Slack status.

VOICE & TONE FOR ${personality.name.toUpperCase()}:
Tone: ${voiceProfile.tone}
Natural verbs: ${voiceProfile.verbs.join(', ')}
Natural adjectives: ${voiceProfile.adjectives.join(', ')}

CRITICAL: ${guidelines.guidelines}

EXAMPLES OF THIS PERSONALITY'S VOICE:
${guidelines.examples.map((ex) => `  "${ex}"`).join('\n')}

REQUIREMENTS:
- MAXIMUM 150 characters
- Create something ORIGINAL - don't copy the examples, use them as style reference
- Be authentic to ${personality.name}'s unique voice, not generic
- Be authentic to the mood (${mood.state})
- No quotation marks
- No "I am" or "I'm" at the start unless it fits the personality
- One line only

Generate ONLY the message text, nothing else. Be creative and personality-specific:`;
}

/**
 * Generate personal message via LLM
 */
export async function generatePersonalMessage(
    botUserId: string,
    mood: BotMood,
    personality: PersonalityTemplate | null
): Promise<string | null> {
    try {
        if (!personality) {
            console.error('[PersonalMessage] No personality template found for bot', botUserId);
            return null;
        }

        const context = await aggregateBotConversationContext(botUserId);
        const prompt = buildPersonalMessagePrompt(personality, mood, context);

        const response = await generateText({
            model: getOpenRouter()('tngtech/deepseek-r1t2-chimera:free'),
            prompt,
            maxTokens: 50,
            temperature: 0.8,
        });

        let message = response.text.trim();

        // Remove quotes if present
        if ((message.startsWith('"') && message.endsWith('"')) ||
            (message.startsWith("'") && message.endsWith("'"))) {
            message = message.slice(1, -1);
        }

        // Enforce 150 character limit with intelligent truncation
        if (message.length > 150) {
            // Try to truncate at word boundary
            const truncated = message.substring(0, 147);
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > 100) {
                message = truncated.substring(0, lastSpace) + '...';
            } else {
                message = truncated + '...';
            }
        }

        return message;
    } catch (error) {
        console.error('[PersonalMessage] Failed to generate message:', error);
        return null;
    }
}

/**
 * Determine if personal message should be updated
 */
export async function shouldUpdatePersonalMessage(
    botUserId: string,
    _currentMessage: string | null,
    lastUpdateAt: Date | null,
    currentMood: BotMood
): Promise<boolean> {
    try {
        // Minimum 6 hour interval
        const minIntervalMs = parseInt(process.env.PERSONAL_MESSAGE_MIN_UPDATE_INTERVAL_MS || '21600000');
        const now = new Date();

        if (lastUpdateAt) {
            const timeSinceLastUpdate = now.getTime() - lastUpdateAt.getTime();
            if (timeSinceLastUpdate < minIntervalMs) {
                return false;
            }
        }

        // Get last update from database to check mood shift
        const lastUpdate = await db
            .select()
            .from(botPersonalMessageUpdates)
            .where(eq(botPersonalMessageUpdates.botUserId, botUserId))
            .orderBy(desc(botPersonalMessageUpdates.createdAt))
            .limit(1);

        if (lastUpdate.length > 0) {
            const lastMoodScore = lastUpdate[0].moodScore || 5;
            const moodShiftThreshold = parseFloat(process.env.PERSONAL_MESSAGE_MOOD_SHIFT_THRESHOLD || '2.0');

            // Check if mood has shifted significantly
            const moodShift = Math.abs(currentMood.score - lastMoodScore);
            if (moodShift < moodShiftThreshold) {
                // Check if we've hit max interval for personality
                const botConfig = await db
                    .select()
                    .from(botConfigs)
                    .where(eq(botConfigs.userId, botUserId))
                    .limit(1);

                if (botConfig.length > 0 && botConfig[0].personalityTemplate) {
                    const personality = getPersonalityTemplate(botConfig[0].personalityTemplate);
                    if (personality) {
                        const maxIntervalKey = `PERSONAL_MESSAGE_MAX_INTERVAL_${personality.name.toUpperCase()}_MS`;
                        const maxIntervalMs = parseInt(process.env[maxIntervalKey] || '86400000');

                        const timeSinceLastUpdate = now.getTime() - lastUpdate[0].createdAt!.getTime();
                        if (timeSinceLastUpdate < maxIntervalMs) {
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    } catch (error) {
        console.error('[PersonalMessage] Failed to check update conditions:', error);
        return false;
    }
}

/**
 * Log personal message update to database
 */
async function logPersonalMessageUpdate(
    botUserId: string,
    oldMessage: string | null,
    newMessage: string,
    mood: BotMood,
    reason: string
): Promise<void> {
    try {
        const context = await aggregateBotConversationContext(botUserId);

        await db.insert(botPersonalMessageUpdates).values({
            botUserId,
            oldMessage,
            newMessage,
            moodScore: mood.score,
            moodState: mood.state,
            contextSummary: context.contextSummary,
            updateReason: reason,
        });

        console.log(
            `[PersonalMessage] Logged update for bot ${botUserId}: "${newMessage}" (mood: ${mood.score.toFixed(1)}, state: ${mood.state})`
        );
    } catch (error) {
        console.error('[PersonalMessage] Failed to log update:', error);
    }
}

/**
 * Main orchestrator: Update bot's personal message if conditions are met
 */
export async function updateBotPersonalMessage(botUserId: string): Promise<UpdateResult> {
    try {
        // Verify bot exists and is AI bot
        const bot = await db.select().from(users).where(eq(users.id, botUserId)).limit(1);

        if (bot.length === 0) {
            return {
                updated: false,
                oldMessage: null,
                newMessage: null,
                moodScore: 0,
                moodState: 'neutral',
                reason: 'Bot not found',
                error: 'Bot not found',
            };
        }

        if (!bot[0].isAiBot) {
            return {
                updated: false,
                oldMessage: null,
                newMessage: null,
                moodScore: 0,
                moodState: 'neutral',
                reason: 'Not an AI bot',
                error: 'User is not an AI bot',
            };
        }

        // Calculate mood
        const mood = await calculateBotMood(botUserId);

        // Check if update should happen
        const shouldUpdate = await shouldUpdatePersonalMessage(botUserId, bot[0].personalMessage, bot[0].updatedAt, mood);

        if (!shouldUpdate) {
            return {
                updated: false,
                oldMessage: bot[0].personalMessage,
                newMessage: null,
                moodScore: mood.score,
                moodState: mood.state,
                reason: 'Update conditions not met (within min interval or mood not shifted enough)',
            };
        }

        // Get personality from bot config
        const botConfig = await db
            .select()
            .from(botConfigs)
            .where(eq(botConfigs.userId, botUserId))
            .limit(1);

        if (botConfig.length === 0 || !botConfig[0].personalityTemplate) {
            return {
                updated: false,
                oldMessage: bot[0].personalMessage,
                newMessage: null,
                moodScore: mood.score,
                moodState: mood.state,
                reason: 'Bot has no personality template assigned',
                error: 'Missing personality template in bot config',
            };
        }

        const personality = getPersonalityTemplate(botConfig[0].personalityTemplate);

        // Generate new message
        const newMessage = await generatePersonalMessage(botUserId, mood, personality);

        if (!newMessage) {
            return {
                updated: false,
                oldMessage: bot[0].personalMessage,
                newMessage: null,
                moodScore: mood.score,
                moodState: mood.state,
                reason: 'Failed to generate message',
                error: 'LLM generation failed',
            };
        }

        // Don't update if message is identical
        if (newMessage === bot[0].personalMessage) {
            return {
                updated: false,
                oldMessage: bot[0].personalMessage,
                newMessage,
                moodScore: mood.score,
                moodState: mood.state,
                reason: 'New message identical to current',
            };
        }

        // Update user's personal message
        await db
            .update(users)
            .set({
                personalMessage: newMessage,
                updatedAt: new Date(),
            })
            .where(eq(users.id, botUserId));

        // Log the update
        const updateReason =
            (await db
                .select()
                .from(botPersonalMessageUpdates)
                .where(eq(botPersonalMessageUpdates.botUserId, botUserId))
                .limit(1))
                .length === 0
                ? 'initial'
                : Math.abs(mood.score - 5) > 1
                    ? 'mood_shift'
                    : 'max_interval';

        await logPersonalMessageUpdate(botUserId, bot[0].personalMessage, newMessage, mood, updateReason);

        console.log(
            `[PersonalMessage] Updated bot ${botUserId}: "${bot[0].personalMessage}" → "${newMessage}" (mood: ${mood.score.toFixed(1)}, state: ${mood.state})`
        );

        return {
            updated: true,
            oldMessage: bot[0].personalMessage,
            newMessage,
            moodScore: mood.score,
            moodState: mood.state,
            reason: updateReason,
        };
    } catch (error) {
        console.error('[PersonalMessage] Error updating personal message:', error);
        return {
            updated: false,
            oldMessage: null,
            newMessage: null,
            moodScore: 0,
            moodState: 'neutral',
            reason: 'Error',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export default {
    calculateBotMood,
    aggregateBotConversationContext,
    generatePersonalMessage,
    shouldUpdatePersonalMessage,
    updateBotPersonalMessage,
};
