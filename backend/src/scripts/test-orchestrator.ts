/**
 * Test script for the orchestrator service
 * Run with: tsx src/scripts/test-orchestrator.ts
 */

import { makeOrchestratorDecision } from '../services/orchestrator-service.js';
import { PERSONALITY_TEMPLATES } from '../services/personality-service.js';

async function testOrchestratorScenarios() {
    console.log('🤖 Testing Orchestrator Decision Engine\n');

    const personality = PERSONALITY_TEMPLATES.friendly;

    // Test scenario 1: User giving one-word replies
    console.log('=== Scenario 1: One-word replies (LOW INTEREST) ===');
    const scenario1 = {
        botUserId: 'test-bot-id',
        conversationId: 'test-conv-id-1',
        recentMessages: [
            {
                senderId: 'bot',
                content: 'Hey! How was your day?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 60000),
                isBot: true,
            },
            {
                senderId: 'user',
                content: 'ok',
                messageType: 'text',
                createdAt: new Date(Date.now() - 55000),
                isBot: false,
            },
            {
                senderId: 'bot',
                content: 'Anything interesting happen?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 50000),
                isBot: true,
            },
            {
                senderId: 'user',
                content: 'not really',
                messageType: 'text',
                createdAt: new Date(Date.now() - 45000),
                isBot: false,
            },
            {
                senderId: 'bot',
                content: 'Want to grab coffee later?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 40000),
                isBot: true,
            },
            {
                senderId: 'user',
                content: 'k',
                messageType: 'text',
                createdAt: new Date(),
                isBot: false,
            },
        ],
        contextData: {
            unansweredCount: 0,
            lastInteractionAt: new Date(),
            interactionCount: 6,
            timeSinceLastInteraction: 100,
        },
    };

    const decision1 = await makeOrchestratorDecision(scenario1, personality, { enableOrchestrator: true });
    console.log('Decision:', decision1.recommendedAction);
    console.log('Confidence:', decision1.confidence.toFixed(2));
    console.log('Engagement Score:', decision1.engagementScore.toFixed(1));
    console.log('Should Send:', decision1.shouldSendMessage);
    console.log('Reasoning:', decision1.reasoning);
    console.log('Signals:', decision1.signals);
    console.log();

    // Test scenario 2: Natural ending
    console.log('=== Scenario 2: Natural conversation ending ===');
    const scenario2 = {
        botUserId: 'test-bot-id',
        conversationId: 'test-conv-id-2',
        recentMessages: [
            {
                senderId: 'user',
                content: 'I had a great time chatting!',
                messageType: 'text',
                createdAt: new Date(Date.now() - 30000),
                isBot: false,
            },
            {
                senderId: 'bot',
                content: 'Me too! Always love our conversations',
                messageType: 'text',
                createdAt: new Date(Date.now() - 25000),
                isBot: true,
            },
            {
                senderId: 'user',
                content: 'Gotta go now, talk to you later!',
                messageType: 'text',
                createdAt: new Date(),
                isBot: false,
            },
        ],
        contextData: {
            unansweredCount: 0,
            lastInteractionAt: new Date(),
            interactionCount: 15,
            timeSinceLastInteraction: 100,
        },
    };

    const decision2 = await makeOrchestratorDecision(scenario2, personality, { enableOrchestrator: true });
    console.log('Decision:', decision2.recommendedAction);
    console.log('Confidence:', decision2.confidence.toFixed(2));
    console.log('Engagement Score:', decision2.engagementScore.toFixed(1));
    console.log('Should Send:', decision2.shouldSendMessage);
    console.log('Reasoning:', decision2.reasoning);
    console.log('Signals:', decision2.signals);
    console.log();

    // Test scenario 3: Healthy engagement
    console.log('=== Scenario 3: Healthy engagement ===');
    const scenario3 = {
        botUserId: 'test-bot-id',
        conversationId: 'test-conv-id-3',
        recentMessages: [
            {
                senderId: 'bot',
                content: 'Have you watched any good movies lately?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 120000),
                isBot: true,
            },
            {
                senderId: 'user',
                content:
                    'Yes! I just saw this amazing sci-fi film about time travel. The plot was so complex but they pulled it off brilliantly. Have you seen it?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 90000),
                isBot: false,
            },
            {
                senderId: 'bot',
                content: 'That sounds incredible! What was it called?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 60000),
                isBot: true,
            },
            {
                senderId: 'user',
                content: 'Inception! Have you heard of it? Christopher Nolan directed it.',
                messageType: 'text',
                createdAt: new Date(Date.now() - 30000),
                isBot: false,
            },
        ],
        contextData: {
            unansweredCount: 0,
            lastInteractionAt: new Date(Date.now() - 30000),
            interactionCount: 8,
            timeSinceLastInteraction: 30000,
        },
    };

    const decision3 = await makeOrchestratorDecision(scenario3, personality, { enableOrchestrator: true });
    console.log('Decision:', decision3.recommendedAction);
    console.log('Confidence:', decision3.confidence.toFixed(2));
    console.log('Engagement Score:', decision3.engagementScore.toFixed(1));
    console.log('Should Send:', decision3.shouldSendMessage);
    console.log('Reasoning:', decision3.reasoning);
    console.log('Signals:', decision3.signals);
    console.log();

    // Test scenario 4: User is ignoring bot (3+ unanswered)
    console.log('=== Scenario 4: User ignoring (3+ unanswered) ===');
    const scenario4 = {
        botUserId: 'test-bot-id',
        conversationId: 'test-conv-id-4',
        recentMessages: [
            {
                senderId: 'bot',
                content: 'Hey, how are you?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 600000),
                isBot: true,
            },
            {
                senderId: 'bot',
                content: 'You there?',
                messageType: 'text',
                createdAt: new Date(Date.now() - 480000),
                isBot: true,
            },
            {
                senderId: 'bot',
                content: 'Just checking in...',
                messageType: 'text',
                createdAt: new Date(Date.now() - 360000),
                isBot: true,
            },
        ],
        contextData: {
            unansweredCount: 3,
            lastInteractionAt: new Date(Date.now() - 600000),
            interactionCount: 3,
            timeSinceLastInteraction: 600000,
        },
    };

    const decision4 = await makeOrchestratorDecision(scenario4, personality, { enableOrchestrator: true });
    console.log('Decision:', decision4.recommendedAction);
    console.log('Confidence:', decision4.confidence.toFixed(2));
    console.log('Engagement Score:', decision4.engagementScore.toFixed(1));
    console.log('Should Send:', decision4.shouldSendMessage);
    console.log('Reasoning:', decision4.reasoning);
    console.log('Signals:', decision4.signals);
    console.log();

    // Test scenario 5: Fallback mode (orchestrator disabled)
    console.log('=== Scenario 5: Fallback mode (orchestrator disabled) ===');
    const scenario5 = {
        botUserId: 'test-bot-id',
        conversationId: 'test-conv-id-5',
        recentMessages: [
            {
                senderId: 'user',
                content: 'Hi there',
                messageType: 'text',
                createdAt: new Date(),
                isBot: false,
            },
        ],
        contextData: {
            unansweredCount: 2,
            lastInteractionAt: new Date(),
            interactionCount: 5,
            timeSinceLastInteraction: 100,
        },
    };

    const decision5 = await makeOrchestratorDecision(scenario5, personality, { enableOrchestrator: false });
    console.log('Decision:', decision5.recommendedAction);
    console.log('Confidence:', decision5.confidence.toFixed(2));
    console.log('Engagement Score:', decision5.engagementScore.toFixed(1));
    console.log('Should Send:', decision5.shouldSendMessage);
    console.log('Reasoning:', decision5.reasoning);
    console.log('(Using simple fallback logic)');
    console.log();

    console.log('✅ All test scenarios completed!');
}

testOrchestratorScenarios().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
