import { db } from '../db/client.js';
import { aiConversations, aiMessages, SelectAIConversation, SelectAIMessage } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText, CoreMessage } from 'ai';

// Initialize OpenRouter client
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
    console.warn('WARNING: OPENROUTER_API_KEY is not set. AI features will not work.');
}

const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey || '',
});

export class AIServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'AIServiceError';
    }
}

export async function createAIConversation(
    userId: string,
    title: string = 'New Conversation'
): Promise<SelectAIConversation> {
    const [conversation] = await db
        .insert(aiConversations)
        .values({
            userId,
            title: title.trim() || 'New Conversation',
        })
        .returning();

    return conversation;
}

export async function updateConversationTitle(
    conversationId: string,
    title: string
): Promise<void> {
    await db
        .update(aiConversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(aiConversations.id, conversationId));
}

export async function generateConversationTitle(
    userMessage: string,
    assistantResponse: string
): Promise<string> {
    try {
        // Use a cheap, fast model to generate the title
        const result = await generateText({
            model: openrouter('meta-llama/llama-3.1-8b-instruct'),
            system: 'Generate a short, concise title (max 6 words) for this conversation based on the user message and AI response. Return only the title, no quotes or extra text.',
            messages: [
                {
                    role: 'user',
                    content: `User: ${userMessage.substring(0, 500)}\n\nAssistant: ${assistantResponse.substring(0, 500)}`,
                },
            ],
            maxTokens: 30,
        });

        return result.text.trim().substring(0, 100) || 'New Conversation';
    } catch (error) {
        // Fallback: use first few words of user message
        return userMessage.split(' ').slice(0, 5).join(' ').substring(0, 50) + '...';
    }
}

export async function getAIConversations(userId: string): Promise<SelectAIConversation[]> {
    const conversations = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.userId, userId))
        .orderBy(desc(aiConversations.updatedAt));

    return conversations;
}

export async function getAIConversation(
    userId: string,
    conversationId: string
): Promise<SelectAIConversation | null> {
    const [conversation] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, conversationId));

    if (!conversation) {
        return null;
    }

    if (conversation.userId !== userId) {
        throw new AIServiceError('Unauthorized', 'UNAUTHORIZED', 403);
    }

    return conversation;
}

export async function getAIMessages(
    userId: string,
    conversationId: string,
    limit: number = 50
): Promise<SelectAIMessage[]> {
    // Verify ownership
    const conversation = await getAIConversation(userId, conversationId);
    if (!conversation) {
        throw new AIServiceError('Conversation not found', 'NOT_FOUND', 404);
    }

    const messages = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .orderBy(aiMessages.createdAt)
        .limit(limit);

    return messages;
}

export async function deleteAIConversation(
    userId: string,
    conversationId: string
): Promise<void> {
    const conversation = await getAIConversation(userId, conversationId);
    if (!conversation) {
        throw new AIServiceError('Conversation not found', 'NOT_FOUND', 404);
    }

    await db
        .delete(aiConversations)
        .where(eq(aiConversations.id, conversationId));
}

export async function saveUserMessage(
    conversationId: string,
    content: string,
    webSearchEnabled: boolean
): Promise<SelectAIMessage> {
    const [message] = await db
        .insert(aiMessages)
        .values({
            conversationId,
            role: 'user',
            content,
            metadata: { webSearchEnabled },
        })
        .returning();

    // Update conversation's updatedAt
    await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.id, conversationId));

    return message;
}

export async function saveAssistantMessage(
    conversationId: string,
    content: string,
    metadata?: Record<string, unknown>
): Promise<SelectAIMessage> {
    const [message] = await db
        .insert(aiMessages)
        .values({
            conversationId,
            role: 'assistant',
            content,
            metadata,
        })
        .returning();

    return message;
}

export async function generateAIResponse(
    conversationId: string,
    webSearchEnabled: boolean
) {
    // Get conversation history
    const messages = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .orderBy(aiMessages.createdAt);

    // Convert to AI SDK format
    const conversationHistory: CoreMessage[] = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
    }));

    // Add system message for web search context
    const systemMessage = webSearchEnabled
        ? 'You are a helpful AI assistant with access to current web information. Provide accurate, up-to-date responses.'
        : 'You are a helpful AI assistant. Provide accurate and helpful responses.';

    // Stream response from OpenRouter
    console.log('Generating AI response with', conversationHistory.length, 'messages');
    const result = streamText({
        model: openrouter('x-ai/grok-4.1-fast:free:online'),
        system: systemMessage,
        messages: conversationHistory,
    });

    return result;
}

export async function isFirstMessage(conversationId: string): Promise<boolean> {
    const messages = await db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .limit(2);

    // If only 1 message (the user message we just saved), it's the first
    return messages.length <= 1;
}
