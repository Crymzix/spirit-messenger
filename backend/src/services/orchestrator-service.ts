/**
 * Orchestrator Service
 *
 * Meta-reasoning layer that decides bot messaging strategy.
 * Uses GPT-4 for understanding conversation dynamics and engagement.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { db } from '../db/client.js';
import {
    orchestratorDecisions,
    messages,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { PersonalityTemplate } from './personality-service.js';

// Lazy initialization
let openrouterInstance: ReturnType<typeof createOpenAI> | null = null;

function getOpenRouter() {
    if (!openrouterInstance) {
        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY required for orchestrator');
        }
        openrouterInstance = createOpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
        });
    }
    return openrouterInstance;
}

/**
 * Orchestrator decision output schema
 */
export interface OrchestratorDecision {
    shouldSendMessage: boolean;
    confidence: number; // 0-1
    reasoning: string;
    engagementScore: number; // 0-10
    recommendedAction: 'send_now' | 'send_delayed' | 'backoff_temporary' | 'backoff_permanent' | 'skip';
    recommendedDelay?: number; // milliseconds
    toneAdjustment?: 'more_casual' | 'more_formal' | 'more_playful' | 'less_eager' | 'neutral';
    signals: {
        responsePatternHealth: 'healthy' | 'declining' | 'poor';
        conversationMomentum: 'strong' | 'moderate' | 'weak' | 'dead';
        userInterestLevel: 'high' | 'medium' | 'low' | 'disinterested';
        naturalEndingDetected: boolean;
    };
}

/**
 * Conversation analysis input
 */
export interface ConversationAnalysis {
    botUserId: string;
    conversationId: string;
    recentMessages: Array<{
        senderId: string;
        content: string;
        messageType: string;
        createdAt: Date;
        isBot: boolean;
    }>;
    contextData: {
        unansweredCount: number;
        lastInteractionAt: Date | null;
        interactionCount: number;
        timeSinceLastInteraction: number; // ms
    };
    userEngagementHistory?: UserEngagementMetrics | null;
}

/**
 * User engagement metrics (per-user learning)
 */
export interface UserEngagementMetrics {
    userId: string;
    averageResponseTime: number; // ms
    averageMessageLength: number;
    responseRate: number; // 0-1
    recentEngagementTrend: 'improving' | 'stable' | 'declining';
    oneWordReplyCount: number;
    totalMessagesExchanged: number;
}

/**
 * Main orchestrator decision function
 * This is called before generating an autonomous message
 */
export async function makeOrchestratorDecision(
    analysis: ConversationAnalysis,
    personality: PersonalityTemplate,
    config: {
        orchestratorModel?: string;
        enableOrchestrator?: boolean;
    } = {}
): Promise<OrchestratorDecision> {
    const {
        orchestratorModel = 'tngtech/deepseek-r1t2-chimera:free',
        enableOrchestrator = true,
    } = config;

    // Feature flag check
    if (!enableOrchestrator) {
        return createSimpleFallbackDecision(analysis);
    }

    try {
        // Compute engagement signals
        const signals = analyzeConversationSignals(analysis);

        // Build orchestrator prompt
        const prompt = buildOrchestratorPrompt(analysis, personality, signals);

        console.log(`[Orchestrator] Analyzing conversation for bot ${analysis.botUserId}`);

        // Call model for reasoning
        const response = await generateText({
            model: getOpenRouter()(orchestratorModel),
            prompt,
            maxTokens: 800,
            temperature: 0.3, // Lower temperature for consistent reasoning
        });

        // Parse structured response
        const decision = parseOrchestratorResponse(response.text, signals);

        // Log decision for learning
        await logOrchestratorDecision(
            analysis.botUserId,
            analysis.conversationId,
            decision
        );

        console.log(`[Orchestrator] Decision: ${decision.recommendedAction} (confidence: ${decision.confidence.toFixed(2)}, engagement: ${decision.engagementScore.toFixed(1)}/10)`);

        return decision;
    } catch (error) {
        console.error('[Orchestrator] Decision failed:', error);
        console.log('[Orchestrator] Falling back to simple decision logic');
        return createSimpleFallbackDecision(analysis);
    }
}

/**
 * Analyze conversation for engagement signals
 */
function analyzeConversationSignals(
    analysis: ConversationAnalysis
): OrchestratorDecision['signals'] {
    const { recentMessages, contextData } = analysis;

    // Get only user messages (non-bot)
    const userMessages = recentMessages.filter(m => !m.isBot);
    const botMessages = recentMessages.filter(m => m.isBot);

    // Analyze response patterns
    const responsePatternHealth = analyzeResponsePattern(userMessages, botMessages);

    // Analyze conversation momentum
    const conversationMomentum = analyzeConversationMomentum(userMessages, contextData);

    // Analyze user interest
    const userInterestLevel = analyzeUserInterest(userMessages, contextData);

    // Detect natural ending
    const naturalEndingDetected = detectNaturalEnding(userMessages);

    return {
        responsePatternHealth,
        conversationMomentum,
        userInterestLevel,
        naturalEndingDetected,
    };
}

/**
 * Response pattern analysis
 */
function analyzeResponsePattern(
    userMessages: ConversationAnalysis['recentMessages'],
    _botMessages: ConversationAnalysis['recentMessages']
): 'healthy' | 'declining' | 'poor' {
    if (userMessages.length === 0) return 'poor';

    const last5UserMessages = userMessages.slice(-5);
    const last10UserMessages = userMessages.slice(-10);

    // Calculate average message length trend
    const recent5AvgLength = last5UserMessages.reduce((sum, m) => sum + m.content.length, 0) / last5UserMessages.length;
    const recent10AvgLength = last10UserMessages.length > 5
        ? last10UserMessages.slice(0, -5).reduce((sum, m) => sum + m.content.length, 0) / (last10UserMessages.length - 5)
        : recent5AvgLength;

    // Declining if recent messages are significantly shorter
    const lengthDecline = recent10AvgLength > 0 && (recent5AvgLength / recent10AvgLength) < 0.6;

    // Count one-word replies in last 5
    const oneWordReplies = last5UserMessages.filter(m =>
        m.content.trim().split(/\s+/).length <= 2 &&
        m.content.length < 15
    ).length;

    // Poor if 3+ one-word replies in last 5
    if (oneWordReplies >= 3) return 'poor';

    // Declining if message length dropping or 2 one-word replies
    if (lengthDecline || oneWordReplies >= 2) return 'declining';

    return 'healthy';
}

/**
 * Conversation momentum analysis
 */
function analyzeConversationMomentum(
    _userMessages: ConversationAnalysis['recentMessages'],
    contextData: ConversationAnalysis['contextData']
): 'strong' | 'moderate' | 'weak' | 'dead' {
    const { timeSinceLastInteraction, unansweredCount } = contextData;

    // Dead if 3+ unanswered or 24+ hours silence
    if (unansweredCount >= 3 || timeSinceLastInteraction > 86400000) {
        return 'dead';
    }

    // Weak if 2 unanswered or 6+ hours silence
    if (unansweredCount >= 2 || timeSinceLastInteraction > 21600000) {
        return 'weak';
    }

    // Moderate if 1 unanswered or 2+ hours silence
    if (unansweredCount >= 1 || timeSinceLastInteraction > 7200000) {
        return 'moderate';
    }

    // Strong momentum
    return 'strong';
}

/**
 * User interest level analysis
 */
function analyzeUserInterest(
    userMessages: ConversationAnalysis['recentMessages'],
    _contextData: ConversationAnalysis['contextData']
): 'high' | 'medium' | 'low' | 'disinterested' {
    if (userMessages.length === 0) return 'disinterested';

    const lastUserMessage = userMessages[userMessages.length - 1];
    const last3UserMessages = userMessages.slice(-3);

    // Disinterested signals
    const disinterestedPhrases = [
        'ok', 'k', 'kk', 'sure', 'yeah', 'yep', 'cool', 'nice',
        'gtg', 'gotta go', 'talk later', 'bye', 'ttyl', 'brb'
    ];

    const lastMessageLower = lastUserMessage.content.toLowerCase().trim();
    const isDisinterestedPhrase = disinterestedPhrases.some(phrase =>
        lastMessageLower === phrase || lastMessageLower === phrase + '.'
    );

    if (isDisinterestedPhrase && lastUserMessage.content.length < 15) {
        return 'disinterested';
    }

    // High interest signals
    const highInterestSignals = [
        lastUserMessage.content.includes('?'), // Asking questions
        lastUserMessage.content.length > 100, // Long messages
        last3UserMessages.filter(m => m.content.includes('!')).length >= 2, // Enthusiasm
    ];

    const highInterestCount = highInterestSignals.filter(Boolean).length;

    if (highInterestCount >= 2) return 'high';
    if (highInterestCount === 1) return 'medium';

    // Check for declining engagement
    const avgLength = last3UserMessages.reduce((sum, m) => sum + m.content.length, 0) / last3UserMessages.length;
    if (avgLength < 20) return 'low';

    return 'medium';
}

/**
 * Detect natural conversation endings
 */
function detectNaturalEnding(
    userMessages: ConversationAnalysis['recentMessages']
): boolean {
    if (userMessages.length === 0) return false;

    const lastMessage = userMessages[userMessages.length - 1];
    const lastMessageLower = lastMessage.content.toLowerCase();

    // Natural ending phrases
    const endingPhrases = [
        'good night', 'goodnight', 'gn', 'sleep well', 'sweet dreams',
        'talk to you later', 'ttyl', 'talk later', 'catch you later',
        'gotta go', 'gtg', 'have to go', 'need to go',
        'bye', 'goodbye', 'see you', 'see ya', 'later',
        'take care', 'have a good day', 'have a good one'
    ];

    return endingPhrases.some(phrase => lastMessageLower.includes(phrase));
}

/**
 * Build orchestrator prompt for GPT-4
 */
function buildOrchestratorPrompt(
    analysis: ConversationAnalysis,
    personality: PersonalityTemplate,
    signals: OrchestratorDecision['signals']
): string {
    const { recentMessages, contextData, userEngagementHistory } = analysis;

    // Format recent conversation
    const conversationText = recentMessages.slice(-10).map(m => {
        const sender = m.isBot ? 'Bot' : 'User';
        return `${sender}: ${m.content}`;
    }).join('\n');

    return `You are an AI orchestrator that analyzes conversation engagement and decides if a bot should send an autonomous (unsolicited) message.

CONVERSATION (last 10 messages):
${conversationText}

BOT PERSONALITY: ${personality.name} - ${personality.description}

CURRENT SIGNALS:
- Unanswered messages from bot: ${contextData.unansweredCount}
- Time since last user interaction: ${Math.round(contextData.timeSinceLastInteraction / 60000)} minutes
- Total conversation interactions: ${contextData.interactionCount}
- Response pattern: ${signals.responsePatternHealth}
- Conversation momentum: ${signals.conversationMomentum}
- User interest level: ${signals.userInterestLevel}
- Natural ending detected: ${signals.naturalEndingDetected ? 'YES' : 'NO'}

${userEngagementHistory ? `
USER ENGAGEMENT HISTORY:
- Average response time: ${Math.round(userEngagementHistory.averageResponseTime / 1000)}s
- Average message length: ${Math.round(userEngagementHistory.averageMessageLength)} chars
- Response rate: ${(userEngagementHistory.responseRate * 100).toFixed(0)}%
- Recent trend: ${userEngagementHistory.recentEngagementTrend}
- One-word replies: ${userEngagementHistory.oneWordReplyCount} times
` : ''}

YOUR TASK:
Analyze this conversation and decide if the bot should send an autonomous message now.

CRITICAL DECISION RULES:
1. **One-word replies** ("ok", "k", "cool", "yeah"): LOW INTEREST - recommend backoff
2. **Declining message length**: User messages getting shorter = LOSING INTEREST - increase delays
3. **Natural ending phrases** ("bye", "gtg", "talk later"): CONVERSATION ENDED - don't message
4. **Unanswered count**: 1+ = getting annoying, 2+ = getting very annoying, 3+ = MUST STOP
5. **Just ended conversation**: Give them hours of space, not minutes
6. **No response for 6+ hours**: User is clearly not engaged right now
7. **Response pattern health**: "poor" or "declining" = user not interested

ENGAGE STRATEGICALLY:
- "strong" momentum + "healthy" responses = good time to send
- "moderate" momentum + "medium" interest = maybe send with longer delay
- "weak"/"dead" momentum or "low"/"disinterested" interest = DON'T SEND

Respond in EXACT JSON format (no markdown, no explanation, pure JSON):
{
  "shouldSendMessage": boolean,
  "confidence": number_between_0_and_1,
  "reasoning": "brief explanation",
  "engagementScore": number_between_0_and_10,
  "recommendedAction": "send_now|send_delayed|backoff_temporary|backoff_permanent|skip",
  "recommendedDelay": milliseconds_or_null,
  "toneAdjustment": "more_casual|less_eager|neutral|null"
}

Be CONSERVATIVE. It's better to not message than to be annoying. Respect natural endings and clear disengagement.`;
}

/**
 * Parse orchestrator response
 */
function parseOrchestratorResponse(
    responseText: string,
    signals: OrchestratorDecision['signals']
): OrchestratorDecision {
    try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in orchestrator response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            shouldSendMessage: parsed.shouldSendMessage ?? false,
            confidence: parsed.confidence ?? 0.5,
            reasoning: parsed.reasoning ?? 'No reasoning provided',
            engagementScore: Math.max(0, Math.min(10, parsed.engagementScore ?? 5)),
            recommendedAction: parsed.recommendedAction ?? 'skip',
            recommendedDelay: parsed.recommendedDelay,
            toneAdjustment: parsed.toneAdjustment,
            signals,
        };
    } catch (error) {
        console.error('[Orchestrator] Failed to parse response:', error);
        console.error('[Orchestrator] Response text:', responseText);

        // Return conservative fallback
        return {
            shouldSendMessage: false,
            confidence: 0,
            reasoning: 'Failed to parse orchestrator response',
            engagementScore: 5,
            recommendedAction: 'skip',
            signals,
        };
    }
}

/**
 * Simple fallback decision logic (when orchestrator is disabled)
 */
function createSimpleFallbackDecision(
    analysis: ConversationAnalysis
): OrchestratorDecision {
    const { contextData } = analysis;
    const maxUnanswered = 3;

    if (contextData.unansweredCount >= maxUnanswered) {
        return {
            shouldSendMessage: false,
            confidence: 1.0,
            reasoning: 'Simple backoff: 3+ unanswered messages',
            engagementScore: 3,
            recommendedAction: 'backoff_permanent',
            signals: {
                responsePatternHealth: 'poor',
                conversationMomentum: 'dead',
                userInterestLevel: 'disinterested',
                naturalEndingDetected: false,
            },
        };
    }

    return {
        shouldSendMessage: true,
        confidence: 0.7,
        reasoning: 'Simple fallback: under unanswered threshold',
        engagementScore: 6,
        recommendedAction: 'send_now',
        signals: {
            responsePatternHealth: 'healthy',
            conversationMomentum: 'moderate',
            userInterestLevel: 'medium',
            naturalEndingDetected: false,
        },
    };
}

/**
 * Log orchestrator decision for learning
 */
async function logOrchestratorDecision(
    botUserId: string,
    conversationId: string,
    decision: OrchestratorDecision
): Promise<void> {
    try {
        await db.insert(orchestratorDecisions).values({
            botUserId,
            conversationId,
            decision: decision.recommendedAction,
            confidence: decision.confidence,
            engagementScore: decision.engagementScore,
            reasoning: decision.reasoning,
            signals: decision.signals,
            toneAdjustment: decision.toneAdjustment,
            outcome: null, // Will be updated later based on user response
        });
    } catch (error) {
        console.error('[Orchestrator] Failed to log decision:', error);
    }
}

/**
 * Compute user engagement profile from history
 */
export async function computeUserEngagementProfile(
    userId: string,
    _botUserId: string,
    conversationId: string
): Promise<UserEngagementMetrics | null> {
    try {
        // Get user's message history in this conversation
        const userMessages = await db
            .select({
                content: messages.content,
                createdAt: messages.createdAt,
            })
            .from(messages)
            .where(
                and(
                    eq(messages.conversationId, conversationId),
                    eq(messages.senderId, userId)
                )
            )
            .orderBy(desc(messages.createdAt))
            .limit(50);

        if (userMessages.length === 0) return null;

        // Calculate metrics
        const avgMessageLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;

        const oneWordReplyCount = userMessages.filter(m =>
            m.content.trim().split(/\s+/).length <= 2 && m.content.length < 15
        ).length;

        // Trend analysis (compare recent vs older messages)
        const recentAvgLength = userMessages.slice(0, 10).reduce((sum, m) => sum + m.content.length, 0) / Math.min(10, userMessages.length);
        const olderAvgLength = userMessages.length > 10
            ? userMessages.slice(10).reduce((sum, m) => sum + m.content.length, 0) / (userMessages.length - 10)
            : recentAvgLength;

        const recentEngagementTrend =
            recentAvgLength > olderAvgLength * 1.2 ? 'improving' :
                recentAvgLength < olderAvgLength * 0.8 ? 'declining' :
                    'stable';

        return {
            userId,
            averageResponseTime: 180000, // Placeholder: 3 minutes
            averageMessageLength: avgMessageLength,
            responseRate: 0.8, // Placeholder
            recentEngagementTrend,
            oneWordReplyCount,
            totalMessagesExchanged: userMessages.length,
        };
    } catch (error) {
        console.error('[Orchestrator] Failed to compute user engagement profile:', error);
        return null;
    }
}

export default {
    makeOrchestratorDecision,
    computeUserEngagementProfile,
};
