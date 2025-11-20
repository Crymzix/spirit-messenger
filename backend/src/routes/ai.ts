import { FastifyPluginAsync } from 'fastify';
import type { ApiResponse } from '../types/index.js';
import {
    createAIConversation,
    getAIConversations,
    getAIMessages,
    deleteAIConversation,
    saveUserMessage,
    saveAssistantMessage,
    generateAIResponse,
    generateConversationTitle,
    updateConversationTitle,
    isFirstMessage,
    AIServiceError,
} from '../services/ai-service.js';
import type { SelectAIConversation, SelectAIMessage } from '../db/schema.js';

interface SendMessageBody {
    conversationId?: string; // Optional - if not provided, create new conversation
    content: string;
    webSearchEnabled: boolean;
}

const aiRoutes: FastifyPluginAsync = async (fastify) => {
    // Get all AI conversations
    fastify.get<{
        Reply: ApiResponse<{ conversations: SelectAIConversation[] }>;
    }>(
        '/conversations',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const conversations = await getAIConversations(request.user.id);

                return reply.status(200).send({
                    success: true,
                    data: { conversations },
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // Get messages for a conversation
    fastify.get<{
        Params: { conversationId: string };
        Querystring: { limit?: string };
        Reply: ApiResponse<{ messages: SelectAIMessage[] }>;
    }>(
        '/conversations/:conversationId/messages',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const limit = request.query.limit
                    ? parseInt(request.query.limit, 10)
                    : 50;

                const messages = await getAIMessages(
                    request.user.id,
                    request.params.conversationId,
                    limit
                );

                return reply.status(200).send({
                    success: true,
                    data: { messages },
                });
            } catch (error) {
                if (error instanceof AIServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // Delete AI conversation
    fastify.delete<{
        Params: { conversationId: string };
        Reply: ApiResponse<void>;
    }>(
        '/conversations/:conversationId',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                await deleteAIConversation(
                    request.user.id,
                    request.params.conversationId
                );

                return reply.status(200).send({
                    success: true,
                });
            } catch (error) {
                if (error instanceof AIServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );

    // Send message and get AI response (streaming)
    // Creates conversation automatically if conversationId not provided
    fastify.post<{
        Body: SendMessageBody;
    }>(
        '/messages',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['content', 'webSearchEnabled'],
                    properties: {
                        conversationId: { type: 'string', format: 'uuid' },
                        content: { type: 'string', minLength: 1 },
                        webSearchEnabled: { type: 'boolean' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized',
                    });
                }

                const { content, webSearchEnabled } = request.body;
                let { conversationId } = request.body;
                let conversation: SelectAIConversation | undefined;
                let isNewConversation = false;

                // Create conversation if not provided
                if (!conversationId) {
                    conversation = await createAIConversation(request.user.id);
                    conversationId = conversation.id;
                    isNewConversation = true;
                }

                // Save user message
                const userMessage = await saveUserMessage(
                    conversationId,
                    content,
                    webSearchEnabled
                );

                // Check if this is the first message (for title generation)
                const shouldGenerateTitle = isNewConversation || await isFirstMessage(conversationId);

                // Generate AI response (streaming)
                const result = await generateAIResponse(
                    conversationId,
                    webSearchEnabled
                );

                // Set headers for streaming (include CORS headers since we're bypassing Fastify)
                const origin = request.headers.origin;
                reply.raw.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    ...(origin && {
                        'Access-Control-Allow-Origin': origin,
                        'Access-Control-Allow-Credentials': 'true',
                    }),
                });

                // Send conversation info if newly created
                if (conversation) {
                    reply.raw.write(`data: ${JSON.stringify({
                        type: 'conversation',
                        conversation,
                    })}\n\n`);
                }

                // Collect full response for saving
                let fullResponse = '';

                // Stream the response
                try {
                    for await (const chunk of result.textStream) {
                        fullResponse += chunk;
                        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                    }
                } catch (streamError) {
                    fastify.log.error({ err: streamError }, 'Stream error');
                    reply.raw.write(`data: ${JSON.stringify({ error: 'Stream error: ' + (streamError as Error).message })}\n\n`);
                    reply.raw.end();
                    return;
                }

                if (!fullResponse) {
                    fastify.log.warn('No response generated from AI');
                }

                // Save assistant message
                const assistantMessage = await saveAssistantMessage(
                    conversationId,
                    fullResponse,
                    { model: 'anthropic/claude-3.5-sonnet', webSearchEnabled }
                );

                // Generate title for first message using cheap model
                let generatedTitle: string | undefined;
                if (shouldGenerateTitle) {
                    generatedTitle = await generateConversationTitle(content, fullResponse);
                    await updateConversationTitle(conversationId, generatedTitle);
                }

                // Send final message with saved data
                reply.raw.write(`data: ${JSON.stringify({
                    done: true,
                    message: assistantMessage,
                    userMessage,
                    conversationId,
                    ...(generatedTitle && { title: generatedTitle }),
                })}\n\n`);

                reply.raw.end();
            } catch (error) {
                if (error instanceof AIServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message,
                    });
                }
                fastify.log.error(error);

                // If streaming already started, send error in stream
                if (reply.raw.headersSent) {
                    reply.raw.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
                    reply.raw.end();
                    return;
                }

                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error',
                });
            }
        }
    );
};

export default aiRoutes;
