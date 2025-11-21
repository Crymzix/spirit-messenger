/**
 * LLM Service
 *
 * Handles AI response generation using OpenRouter via AI SDK.
 * Uses OpenRouter's built-in web search by appending ":online" to model IDs.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import {
    PersonalityTemplate,
    buildSystemPrompt,
} from './personality-service.js';

// Initialize OpenRouter client via AI SDK's OpenAI provider
const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: 'https://openrouter.ai/api/v1',
});

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
    senderName?: string;
}

export interface LLMResponseOptions {
    personality: PersonalityTemplate;
    conversationHistory: Message[];
    userMessage: string;
    botName: string;
    userName?: string;
    currentTime: Date;
    enableWebSearch?: boolean;
    model?: string;
}

export interface LLMResponse {
    content: string;
    shouldNudge: boolean;
    emoticonSuggestions: string[];
}

/**
 * Generate a response from the LLM
 */
export async function generateResponse(options: LLMResponseOptions): Promise<LLMResponse> {
    const {
        personality,
        conversationHistory,
        userMessage,
        botName,
        userName,
        currentTime,
        enableWebSearch = false,
        model = 'google/gemini-flash-1.5',
    } = options;

    // Append :online suffix for web search capability
    const modelId = enableWebSearch ? `${model}:online` : model;

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(personality, {
        botName,
        userName,
        currentTime,
        conversationContext: buildConversationSummary(conversationHistory),
    });

    // Build messages array for the LLM
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    // Add conversation history (last 20 messages for context)
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
            const prefix = msg.senderName ? `${msg.senderName}: ` : '';
            messages.push({
                role: msg.role,
                content: `${prefix}${msg.content}`,
            });
        }
    }

    // Add the current user message
    messages.push({
        role: 'user',
        content: userName ? `${userName}: ${userMessage}` : userMessage,
    });

    try {
        const response = await generateText({
            model: openrouter(modelId),
            system: systemPrompt,
            messages,
            maxTokens: 500, // Keep responses reasonably sized
            temperature: 0.8 + (personality.traits.humor * 0.2), // More humor = more creative
        });

        const responseText = response.text;

        // Analyze response for actions
        const analysis = analyzeResponse(responseText, personality);

        return {
            content: cleanResponse(responseText),
            shouldNudge: analysis.shouldNudge,
            emoticonSuggestions: analysis.emoticonSuggestions,
        };
    } catch (error) {
        console.error('LLM generation error:', error);
        throw new Error(`Failed to generate LLM response: ${(error as Error).message}`);
    }
}

/**
 * Check if a message likely needs web search for current information
 */
export function messageNeedsWebSearch(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Keywords that suggest need for current information
    const searchTriggers = [
        'latest', 'current', 'today', 'yesterday', 'this week', 'this month',
        'news', 'weather', 'score', 'price', 'stock', 'update',
        'what happened', 'what\'s happening', 'did you hear', 'have you heard',
        'who won', 'when is', 'where is', 'how much',
        'recent', 'new', 'breaking', 'just', 'now',
    ];

    return searchTriggers.some(trigger => lowerMessage.includes(trigger));
}

/**
 * Generate an autonomous message for starting a conversation
 */
export async function generateAutonomousMessage(options: {
    personality: PersonalityTemplate;
    conversationHistory: Message[];
    botName: string;
    userName?: string;
    currentTime: Date;
    model?: string;
}): Promise<string> {
    const {
        personality,
        conversationHistory,
        botName,
        userName,
        currentTime,
        model = 'google/gemini-flash-1.5',
    } = options;

    const systemPrompt = buildSystemPrompt(personality, {
        botName,
        userName,
        currentTime,
    });

    const timeOfDay = getTimeOfDay(currentTime);
    const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });

    // Build context from recent history
    const recentContext = conversationHistory.slice(-5).map(m =>
        `${m.senderName || m.role}: ${m.content}`
    ).join('\n');

    const prompt = `You want to start a conversation or continue one that has gone quiet.

Current context:
- It's ${timeOfDay} on ${dayOfWeek}
- ${recentContext ? `Recent conversation:\n${recentContext}` : 'This is a relatively new conversation'}

Generate a natural, unprompted message to send. This could be:
- A greeting appropriate for the time of day
- Sharing something interesting you "saw" or "thought about"
- Following up on something from earlier
- A random but engaging conversation starter

Keep it natural and conversational. Don't be too eager or overwhelming. Just one message.`;

    try {
        const response = await generateText({
            model: openrouter(model),
            system: systemPrompt,
            prompt,
            maxTokens: 200,
            temperature: 0.9, // Higher temperature for more variety
        });

        return cleanResponse(response.text);
    } catch (error) {
        console.error('Autonomous message generation error:', error);
        // Fallback messages based on time
        const fallbacks = {
            morning: 'Good morning! Hope you slept well 😊',
            afternoon: 'Hey! How\'s your day going?',
            evening: 'Hey there! How was your day?',
            night: 'Still up? What\'s on your mind?',
        };
        return fallbacks[timeOfDay];
    }
}

/**
 * Build a summary of the conversation history
 */
function buildConversationSummary(history: Message[]): string {
    if (history.length === 0) return '';

    if (history.length <= 5) {
        return 'This is a relatively new conversation.';
    }

    // For longer conversations, provide a brief summary
    const messageCount = history.length;
    const topics: string[] = [];

    // Simple topic extraction (could be enhanced with NLP)
    const allContent = history.map(m => m.content).join(' ').toLowerCase();
    if (allContent.includes('work') || allContent.includes('job')) topics.push('work');
    if (allContent.includes('weekend') || allContent.includes('plans')) topics.push('plans');
    if (allContent.includes('movie') || allContent.includes('show')) topics.push('entertainment');
    if (allContent.includes('food') || allContent.includes('eat')) topics.push('food');

    let summary = `Conversation has ${messageCount} messages`;
    if (topics.length > 0) {
        summary += `, discussing: ${topics.join(', ')}`;
    }

    return summary;
}

/**
 * Analyze response for additional actions
 */
function analyzeResponse(
    response: string,
    personality: PersonalityTemplate
): {
    shouldNudge: boolean;
    emoticonSuggestions: string[];
} {
    // Determine if should nudge (playful/teasing context)
    const shouldNudge = Math.random() < personality.nudgeLikelihood &&
        (response.toLowerCase().includes('hey') ||
            response.toLowerCase().includes('hello') ||
            response.toLowerCase().includes('!'));

    // Suggest emoticons based on response sentiment
    const emoticonSuggestions: string[] = [];
    const lowerResponse = response.toLowerCase();

    if (lowerResponse.includes('happy') || lowerResponse.includes('great') || lowerResponse.includes('awesome')) {
        emoticonSuggestions.push(...personality.emoticonPreference.slice(0, 2));
    } else if (lowerResponse.includes('funny') || lowerResponse.includes('lol') || lowerResponse.includes('haha')) {
        emoticonSuggestions.push('teeth_smile', 'wink');
    } else if (lowerResponse.includes('sorry') || lowerResponse.includes('sad')) {
        emoticonSuggestions.push('sad_smile');
    } else if (personality.responseStyle.usesEmojis && Math.random() < 0.3) {
        // Random emoticon from preferences
        const randomEmoticon = personality.emoticonPreference[
            Math.floor(Math.random() * personality.emoticonPreference.length)
        ];
        if (randomEmoticon) {
            emoticonSuggestions.push(randomEmoticon);
        }
    }

    return {
        shouldNudge,
        emoticonSuggestions,
    };
}

/**
 * Clean up the LLM response
 */
function cleanResponse(response: string): string {
    return response
        .trim()
        // Remove any role prefixes the model might add
        .replace(/^(Assistant|Bot|AI|Me):\s*/i, '')
        // Remove excessive newlines
        .replace(/\n{3,}/g, '\n\n')
        // Trim to reasonable length
        .slice(0, 2000);
}

/**
 * Get time of day string
 */
function getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

export default {
    generateResponse,
    messageNeedsWebSearch,
    generateAutonomousMessage,
};
