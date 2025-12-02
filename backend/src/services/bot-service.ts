/**
 * Bot Service
 *
 * Orchestrates bot behavior including response generation, timing, and actions.
 * Handles incoming messages, generates responses, and manages bot tools (nudges, emoticons, web search).
 */

import { db } from '../db/client.js';
import {
    users,
    messages,
    conversationParticipants,
    botConfigs,
    botConversationContexts,
    botAutonomousSchedules,
    botActionLogs,
    type SelectUser,
    type SelectMessage,
    type SelectBotConfig,
} from '../db/schema.js';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import {
    mergePersonality,
    calculateResponseDelay,
    calculateResponseProbability,
    type PersonalityTemplate,
    type CustomPersonalityConfig,
} from './personality-service.js';
import {
    generateResponse,
    generateAutonomousMessage,
    messageNeedsWebSearch,
    type Message as LLMMessage,
} from './llm-service.js';
import {
    makeOrchestratorDecision,
    computeUserEngagementProfile,
} from './orchestrator-service.js';
import { createMessage } from './message-service.js';

export interface BotWithConfig {
    user: SelectUser;
    config: SelectBotConfig;
    personality: PersonalityTemplate;
}

export interface QueuedBotResponse {
    botUserId: string;
    conversationId: string;
    content: string;
    emoticons: string[];
    delay: number;
    typingDuration: number;
    shouldNudge: boolean;
}

/**
 * Get bot configuration and merged personality for a bot user
 */
export async function getBotWithConfig(botUserId: string): Promise<BotWithConfig | null> {
    const [botUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, botUserId), eq(users.isAiBot, true)))
        .limit(1);

    if (!botUser) return null;

    const [config] = await db
        .select()
        .from(botConfigs)
        .where(eq(botConfigs.userId, botUserId))
        .limit(1);

    if (!config) return null;

    // Merge personality template with custom config
    const personality = mergePersonality(
        config.personalityTemplate,
        config.customPersonalityConfig as CustomPersonalityConfig | undefined
    );

    return {
        user: botUser,
        config,
        personality,
    };
}

/**
 * Get all bots that are participants in a conversation
 */
export async function getBotsInConversation(conversationId: string): Promise<BotWithConfig[]> {
    // Get all participants in the conversation who are bots
    const botParticipants = await db
        .select({
            userId: conversationParticipants.userId,
        })
        .from(conversationParticipants)
        .innerJoin(users, eq(conversationParticipants.userId, users.id))
        .where(
            and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(users.isAiBot, true),
                isNull(conversationParticipants.leftAt)
            )
        );

    const bots: BotWithConfig[] = [];
    for (const participant of botParticipants) {
        const bot = await getBotWithConfig(participant.userId);
        if (bot) bots.push(bot);
    }

    return bots;
}

/**
 * Get conversation context (recent messages) for a bot
 */
export async function getConversationContext(
    botUserId: string,
    conversationId: string,
    limit: number = 20
): Promise<LLMMessage[]> {
    // Get recent messages from the conversation
    const recentMessages = await db
        .select({
            id: messages.id,
            content: messages.content,
            senderId: messages.senderId,
            messageType: messages.messageType,
            createdAt: messages.createdAt,
            senderUsername: users.username,
            senderDisplayName: users.displayName,
            senderIsBot: users.isAiBot,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

    // Convert to LLM message format and reverse to chronological order
    return recentMessages.reverse().map(msg => ({
        role: msg.senderId === botUserId ? 'assistant' : 'user' as const,
        content: msg.content,
        timestamp: msg.createdAt || undefined,
        senderName: msg.senderDisplayName || msg.senderUsername,
    }));
}

/**
 * Handle an incoming message to a bot
 * Returns queued response data or null if bot should not respond
 */
export async function handleIncomingMessage(
    messageId: string
): Promise<QueuedBotResponse | null> {
    // Get the message
    const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

    if (!message) {
        console.error(`Message not found: ${messageId}`);
        return null;
    }

    // Get bots in this conversation
    const bots = await getBotsInConversation(message.conversationId);

    if (bots.length === 0) {
        return null;
    }

    // For now, use the first bot (could support multiple bots later)
    const bot = bots[0];

    // Check if this message is from the bot itself
    if (message.senderId === bot.user.id) {
        return null;
    }

    // Get the message sender's info
    const [sender] = await db
        .select()
        .from(users)
        .where(eq(users.id, message.senderId))
        .limit(1);

    // Check if conversation context exists, create if not
    await ensureConversationContext(bot.user.id, message.conversationId);

    // Get conversation history
    const conversationHistory = await getConversationContext(
        bot.user.id,
        message.conversationId
    );

    // Calculate response probability
    const isFirstMessage = conversationHistory.length <= 1;
    const responseProbability = calculateResponseProbability(
        bot.personality,
        new Date(),
        0, // Time since last message (would need to track)
        isFirstMessage
    );

    // Random ignore based on personality
    if (Math.random() > responseProbability) {
        console.log(`Bot ${bot.user.username} ignoring message (probability: ${responseProbability})`);

        // Log the ignore action
        await logBotAction(bot.user.id, message.conversationId, 'ignore', {
            probability: responseProbability,
        });

        return null;
    }

    // Determine if web search is needed
    const enableWebSearch = !!bot.config.webSearchEnabled && messageNeedsWebSearch(message.content);

    // Generate response using LLM
    const llmResponse = await generateResponse({
        personality: bot.personality,
        conversationHistory,
        userMessage: message.content,
        botName: bot.user.displayName || bot.user.username,
        userName: sender?.displayName || sender?.username,
        currentTime: new Date(),
        enableWebSearch,
    });

    // Calculate response delay
    const delay = calculateResponseDelay(
        bot.personality,
        message.content,
        {
            responseDelayMin: bot.config.responseDelayMin || 1000,
            responseDelayMax: bot.config.responseDelayMax || 5000,
            typingSpeed: bot.config.typingSpeed || 50,
        },
        new Date()
    );

    // Calculate typing duration based on response length
    const typingDuration = Math.min(
        llmResponse.content.length * (bot.config.typingSpeed || 50),
        10000 // Max 10 seconds of typing
    );

    // Determine if should nudge
    const shouldNudge = llmResponse.shouldNudge &&
        Math.random() < (bot.config.nudgeProbability || 0.05);

    // Log the response action
    await logBotAction(bot.user.id, message.conversationId, 'response', {
        delay,
        typingDuration,
        shouldNudge,
        emoticons: llmResponse.emoticonSuggestions,
        webSearchUsed: enableWebSearch,
    });

    // Update conversation context
    await updateConversationContext(bot.user.id, message.conversationId);

    return {
        botUserId: bot.user.id,
        conversationId: message.conversationId,
        content: llmResponse.content,
        emoticons: llmResponse.emoticonSuggestions,
        delay,
        typingDuration,
        shouldNudge,
    };
}

/**
 * Send a bot message (called by worker after delay)
 */
export async function sendBotMessage(
    botUserId: string,
    conversationId: string,
    content: string,
    emoticons: string[] = []
): Promise<SelectMessage> {
    // Build emoticon metadata
    const emoticonMetadata = emoticons.length > 0
        ? emoticons.map((code) => ({
            position: content.length - 1, // Add at end for simplicity
            code,
        }))
        : undefined;

    // Create the message
    const message = await createMessage(botUserId, {
        conversationId,
        content,
        messageType: 'text',
        metadata: emoticonMetadata ? { emoticons: emoticonMetadata } : undefined,
    });

    return message;
}

/**
 * Send a nudge from a bot
 */
export async function sendBotNudge(
    botUserId: string,
    conversationId: string
): Promise<SelectMessage> {
    const message = await createMessage(botUserId, {
        conversationId,
        content: 'sent a nudge',
        messageType: 'system',
        metadata: { action: 'nudge' },
    });

    await logBotAction(botUserId, conversationId, 'nudge', {});

    return message;
}

/**
 * Generate and queue an autonomous message from a bot
 * NOW WITH ORCHESTRATOR INTEGRATION
 */
export async function generateAutonomousBotMessage(
    botUserId: string,
    conversationId: string
): Promise<QueuedBotResponse | null> {
    const bot = await getBotWithConfig(botUserId);
    if (!bot) return null;

    // Check if orchestrator is enabled
    const useOrchestrator = process.env.ENABLE_ORCHESTRATOR === 'true';

    // ========== NEW: ORCHESTRATOR DECISION ==========

    if (useOrchestrator) {
        // Get conversation data for orchestrator analysis
        const contextData = await getConversationContextData(botUserId, conversationId);
        const recentMessages = await getRecentMessagesForAnalysis(conversationId, 20);

        // Get user participant for engagement profile
        const userParticipant = await getUserParticipantInConversation(conversationId);
        const userEngagementHistory = userParticipant
            ? await computeUserEngagementProfile(userParticipant.userId, botUserId, conversationId)
            : undefined;

        // Make orchestrator decision
        const orchestratorDecision = await makeOrchestratorDecision(
            {
                botUserId,
                conversationId,
                recentMessages,
                contextData,
                userEngagementHistory,
            },
            bot.personality,
            {
                orchestratorModel: process.env.ORCHESTRATOR_MODEL || 'openai/gpt-4-turbo',
                enableOrchestrator: true,
            }
        );

        // Respect orchestrator decision
        if (!orchestratorDecision.shouldSendMessage) {
            // Log the backoff action
            await logBotAction(botUserId, conversationId, 'orchestrator_backoff', {
                decision: orchestratorDecision.recommendedAction,
                reasoning: orchestratorDecision.reasoning,
                engagementScore: orchestratorDecision.engagementScore,
                signals: orchestratorDecision.signals,
            });

            return null;
        }
    } else {
        // ========== OLD: SIMPLE BACKOFF (fallback) ==========
        const unansweredCount = await getUnansweredCount(botUserId, conversationId);
        const maxUnanswered = 3; // Stop after 3 unanswered messages

        if (unansweredCount >= maxUnanswered) {
            console.log(`Bot ${bot.user.username} backing off - ${unansweredCount} unanswered messages`);
            return null;
        }
    }

    // Get conversation history
    const conversationHistory = await getConversationContext(botUserId, conversationId);

    // Get recipient info
    const participants = await db
        .select({
            userId: conversationParticipants.userId,
            username: users.username,
            displayName: users.displayName,
        })
        .from(conversationParticipants)
        .innerJoin(users, eq(conversationParticipants.userId, users.id))
        .where(
            and(
                eq(conversationParticipants.conversationId, conversationId),
                isNull(conversationParticipants.leftAt)
            )
        );

    const recipient = participants.find(p => p.userId !== botUserId);

    // Generate autonomous message
    const content = await generateAutonomousMessage({
        personality: bot.personality,
        conversationHistory,
        botName: bot.user.displayName || bot.user.username,
        userName: recipient?.displayName || recipient?.username,
        currentTime: new Date(),
    });

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        console.error('Generated autonomous message is empty');
        return null;
    }

    // Calculate delay
    let delay: number;
    if (useOrchestrator) {
        // Delay already calculated by orchestrator - would be used if we were getting it from decision
        const baseDelay = Math.random() * 5000 + 2000; // 2-7 seconds
        delay = baseDelay; // Orchestrator could override this, but for now use normal delay
    } else {
        // Old backoff logic
        const unansweredCount = await getUnansweredCount(botUserId, conversationId);
        const baseDelay = Math.random() * 5000 + 2000; // 2-7 seconds
        const backoffMultiplier = Math.pow(2, unansweredCount); // 1x, 2x, 4x
        delay = baseDelay * backoffMultiplier;
    }

    const typingDuration = Math.min(content.length * (bot.config.typingSpeed || 50), 5000);

    // Update autonomous schedule and increment unanswered count
    await updateAutonomousSchedule(botUserId);
    await incrementUnansweredCount(botUserId, conversationId);

    // Log the action
    await logBotAction(botUserId, conversationId, 'autonomous_message', {
        delay,
        typingDuration,
        orchestratorUsed: useOrchestrator,
    });

    return {
        botUserId,
        conversationId,
        content,
        emoticons: [],
        delay,
        typingDuration,
        shouldNudge: false,
    };
}

/**
 * Get all bots with autonomous messaging enabled
 */
export async function getBotsWithAutonomousMessaging(): Promise<BotWithConfig[]> {
    const configs = await db
        .select()
        .from(botConfigs)
        .where(eq(botConfigs.autonomousMessagingEnabled, true));

    const bots: BotWithConfig[] = [];
    for (const config of configs) {
        const bot = await getBotWithConfig(config.userId);
        if (bot) bots.push(bot);
    }

    return bots;
}

/**
 * Ensure conversation context exists for a bot
 */
async function ensureConversationContext(
    botUserId: string,
    conversationId: string
): Promise<void> {
    const [existing] = await db
        .select()
        .from(botConversationContexts)
        .where(
            and(
                eq(botConversationContexts.botUserId, botUserId),
                eq(botConversationContexts.conversationId, conversationId)
            )
        )
        .limit(1);

    if (!existing) {
        await db.insert(botConversationContexts).values({
            botUserId,
            conversationId,
            contextHistory: [],
            interactionCount: 0,
        });
    }
}

/**
 * Update conversation context after an interaction
 */
async function updateConversationContext(
    botUserId: string,
    conversationId: string
): Promise<void> {
    await db
        .update(botConversationContexts)
        .set({
            lastInteractionAt: new Date(),
            interactionCount: sql`${botConversationContexts.interactionCount} + 1`,
            unansweredCount: 0, // Reset when user interacts
        })
        .where(
            and(
                eq(botConversationContexts.botUserId, botUserId),
                eq(botConversationContexts.conversationId, conversationId)
            )
        );
}

/**
 * Increment unanswered count after autonomous message
 */
async function incrementUnansweredCount(
    botUserId: string,
    conversationId: string
): Promise<void> {
    await db
        .update(botConversationContexts)
        .set({
            unansweredCount: sql`COALESCE(${botConversationContexts.unansweredCount}, 0) + 1`,
        })
        .where(
            and(
                eq(botConversationContexts.botUserId, botUserId),
                eq(botConversationContexts.conversationId, conversationId)
            )
        );
}

/**
 * Get unanswered count for backoff calculation
 */
async function getUnansweredCount(
    botUserId: string,
    conversationId: string
): Promise<number> {
    const [context] = await db
        .select({ unansweredCount: botConversationContexts.unansweredCount })
        .from(botConversationContexts)
        .where(
            and(
                eq(botConversationContexts.botUserId, botUserId),
                eq(botConversationContexts.conversationId, conversationId)
            )
        )
        .limit(1);

    return context?.unansweredCount || 0;
}

/**
 * Update autonomous message schedule
 */
async function updateAutonomousSchedule(botUserId: string): Promise<void> {
    const [existing] = await db
        .select()
        .from(botAutonomousSchedules)
        .where(eq(botAutonomousSchedules.botUserId, botUserId))
        .limit(1);

    if (existing) {
        await db
            .update(botAutonomousSchedules)
            .set({
                lastAutonomousMessageAt: new Date(),
            })
            .where(eq(botAutonomousSchedules.botUserId, botUserId));
    } else {
        await db.insert(botAutonomousSchedules).values({
            botUserId,
            lastAutonomousMessageAt: new Date(),
        });
    }
}

/**
 * Log a bot action
 */
async function logBotAction(
    botUserId: string,
    conversationId: string,
    actionType: string,
    metadata: Record<string, any>
): Promise<void> {
    await db.insert(botActionLogs).values({
        botUserId,
        conversationId,
        actionType,
        actionMetadata: metadata,
    });
}

/**
 * Get active conversations for a bot (for autonomous messaging)
 */
export async function getActiveBotConversations(
    botUserId: string
): Promise<Array<{ conversationId: string; lastMessageAt: Date | null }>> {
    const conversations = await db
        .select({
            conversationId: conversationParticipants.conversationId,
        })
        .from(conversationParticipants)
        .where(
            and(
                eq(conversationParticipants.userId, botUserId),
                isNull(conversationParticipants.leftAt)
            )
        );

    // Get last message time for each conversation
    const result: Array<{ conversationId: string; lastMessageAt: Date | null }> = [];

    for (const conv of conversations) {
        const [lastMessage] = await db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.conversationId, conv.conversationId))
            .orderBy(desc(messages.createdAt))
            .limit(1);

        result.push({
            conversationId: conv.conversationId,
            lastMessageAt: lastMessage?.createdAt || null,
        });
    }

    return result;
}

/**
 * Helper: Get conversation context data for orchestrator
 */
async function getConversationContextData(
    botUserId: string,
    conversationId: string
): Promise<{
    unansweredCount: number;
    lastInteractionAt: Date | null;
    interactionCount: number;
    timeSinceLastInteraction: number;
}> {
    const [context] = await db
        .select()
        .from(botConversationContexts)
        .where(
            and(
                eq(botConversationContexts.botUserId, botUserId),
                eq(botConversationContexts.conversationId, conversationId)
            )
        )
        .limit(1);

    const lastInteractionAt = context?.lastInteractionAt || null;
    const timeSinceLastInteraction = lastInteractionAt
        ? Date.now() - lastInteractionAt.getTime()
        : Infinity;

    return {
        unansweredCount: context?.unansweredCount || 0,
        lastInteractionAt,
        interactionCount: context?.interactionCount || 0,
        timeSinceLastInteraction,
    };
}

/**
 * Helper: Get recent messages for orchestrator analysis
 */
async function getRecentMessagesForAnalysis(
    conversationId: string,
    limit: number = 20
): Promise<Array<{
    senderId: string;
    content: string;
    messageType: string;
    createdAt: Date;
    isBot: boolean;
}>> {
    const msgs = await db
        .select({
            senderId: messages.senderId,
            content: messages.content,
            messageType: messages.messageType,
            createdAt: messages.createdAt,
            isBot: users.isAiBot,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

    return msgs.reverse().map(m => ({
        senderId: m.senderId,
        content: m.content,
        messageType: m.messageType || 'text',
        createdAt: m.createdAt || new Date(),
        isBot: m.isBot || false,
    }));
}

/**
 * Helper: Get user participant (non-bot) in conversation
 */
async function getUserParticipantInConversation(
    conversationId: string
): Promise<{ userId: string } | null> {
    const participants = await db
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .innerJoin(users, eq(conversationParticipants.userId, users.id))
        .where(
            and(
                eq(conversationParticipants.conversationId, conversationId),
                isNull(conversationParticipants.leftAt),
                eq(users.isAiBot, false)
            )
        )
        .limit(1);

    return participants[0] || null;
}

export default {
    getBotWithConfig,
    getBotsInConversation,
    getConversationContext,
    handleIncomingMessage,
    sendBotMessage,
    sendBotNudge,
    generateAutonomousBotMessage,
    getBotsWithAutonomousMessaging,
    getActiveBotConversations,
};
