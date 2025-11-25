/**
 * Messages Routes
 * 
 * Handles message and conversation endpoints.
 * 
 * Note: Typing indicators are NOT implemented as API endpoints. They use Supabase
 * Realtime Presence feature on the frontend for real-time status updates without
 * backend involvement. See TYPING_INDICATORS.md for implementation details.
 */

import { FastifyPluginAsync } from 'fastify';
import {
    createMessage,
    createConversation,
    getConversationMessages,
    getConversationById,
    getUserConversations,
    removeParticipant,
    getUnreadCounts,
    markMessagesAsRead,
    MessageServiceError,
    type MessageWithSender,
    type ConversationWithParticipants,
} from '../services/message-service.js';
import type { ApiResponse } from '../types/index.js';
import type { SelectMessage } from '../db/schema.js';

interface CreateMessageBody {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'file' | 'system' | 'image';
    metadata?: Record<string, any>;
}

interface CreateConversationBody {
    type: 'one_on_one' | 'group';
    participantIds: string[];
    name?: string;
}

interface GetMessagesQuerystring {
    limit?: number;
    beforeMessageId?: string;
}

interface ConversationParams {
    conversationId: string;
}

const messagesRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/messages - Create a new message
    fastify.post<{
        Body: CreateMessageBody;
        Reply: ApiResponse<{ message: SelectMessage }>;
    }>(
        '/messages',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['conversationId', 'content'],
                    properties: {
                        conversationId: {
                            type: 'string',
                            format: 'uuid',
                        },
                        content: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 10000,
                        },
                        messageType: {
                            type: 'string',
                            enum: ['text', 'file', 'system', 'image'],
                        },
                        metadata: {
                            type: 'object',
                        },
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

                const userId = request.user.id;
                const { conversationId, content, messageType, metadata } = request.body;

                // Create message using service
                const message = await createMessage(userId, {
                    conversationId,
                    content,
                    messageType,
                    metadata,
                });

                return reply.status(201).send({
                    success: true,
                    data: {
                        message,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // POST /api/conversations - Create a new conversation
    fastify.post<{
        Body: CreateConversationBody;
        Reply: ApiResponse<{ conversation: ConversationWithParticipants }>;
    }>(
        '/conversations',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['type', 'participantIds'],
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['one_on_one', 'group'],
                        },
                        participantIds: {
                            type: 'array',
                            items: {
                                type: 'string',
                                format: 'uuid',
                            },
                            minItems: 1,
                        },
                        name: {
                            type: 'string',
                            maxLength: 100,
                        },
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

                const userId = request.user.id;
                const { type, participantIds, name } = request.body;

                // Create conversation using service
                const conversation = await createConversation(userId, {
                    type,
                    participantIds,
                    name,
                });

                return reply.status(201).send({
                    success: true,
                    data: {
                        conversation,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // GET /api/conversations/:conversationId/messages - Get messages for a conversation
    fastify.get<{
        Params: ConversationParams;
        Querystring: GetMessagesQuerystring;
        Reply: ApiResponse<{ messages: MessageWithSender[] }>;
    }>(
        '/conversations/:conversationId/messages',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['conversationId'],
                    properties: {
                        conversationId: {
                            type: 'string',
                            format: 'uuid',
                        },
                    },
                },
                querystring: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            minimum: 1,
                            maximum: 100,
                            default: 50,
                        },
                        beforeMessageId: {
                            type: 'string',
                            format: 'uuid',
                        },
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

                const userId = request.user.id;
                const { conversationId } = request.params;
                const { limit = 50, beforeMessageId } = request.query;

                // Get messages using service
                const messages = await getConversationMessages(
                    userId,
                    conversationId,
                    limit,
                    beforeMessageId
                );

                return reply.status(200).send({
                    success: true,
                    data: {
                        messages,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // GET /api/conversations/:conversationId - Get a specific conversation
    fastify.get<{
        Params: ConversationParams;
        Reply: ApiResponse<{ conversation: ConversationWithParticipants | null }>;
    }>(
        '/conversations/:conversationId',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['conversationId'],
                    properties: {
                        conversationId: {
                            type: 'string',
                            format: 'uuid',
                        },
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

                const userId = request.user.id;
                const { conversationId } = request.params;

                // Get conversation using service
                const conversation = await getConversationById(userId, conversationId);

                if (!conversation) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Conversation not found',
                    });
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        conversation,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // GET /api/conversations - Get all conversations for the authenticated user
    fastify.get<{
        Reply: ApiResponse<{ conversations: ConversationWithParticipants[] }>;
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

                const userId = request.user.id;

                // Get user conversations using service
                const conversations = await getUserConversations(userId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        conversations,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // POST /api/conversations/:conversationId/leave - Leave a conversation
    fastify.post<{
        Params: ConversationParams;
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/conversations/:conversationId/leave',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['conversationId'],
                    properties: {
                        conversationId: {
                            type: 'string',
                            format: 'uuid',
                        },
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

                const userId = request.user.id;
                const { conversationId } = request.params;

                // Remove participant (user leaves) using service
                await removeParticipant(userId, conversationId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        success: true,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // POST /api/conversations/:conversationId/nudge - Send a nudge to a conversation
    fastify.post<{
        Params: ConversationParams;
        Reply: ApiResponse<{ message: SelectMessage }>;
    }>(
        '/conversations/:conversationId/nudge',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['conversationId'],
                    properties: {
                        conversationId: {
                            type: 'string',
                            format: 'uuid',
                        },
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

                const userId = request.user.id;
                const { conversationId } = request.params;

                // Create a system message for the nudge
                const message = await createMessage(userId, {
                    conversationId,
                    content: 'sent a nudge',
                    messageType: 'system',
                    metadata: {
                        action: 'nudge',
                    },
                });

                return reply.status(201).send({
                    success: true,
                    data: {
                        message,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // GET /api/conversations/unread-counts - Get unread message counts for all conversations
    fastify.get<{
        Reply: ApiResponse<{ counts: Record<string, number> }>;
    }>(
        '/conversations/unread-counts',
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

                const userId = request.user.id;
                const counts = await getUnreadCounts(userId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        counts,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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

    // PUT /api/conversations/:conversationId/read - Mark messages as read in a conversation
    fastify.put<{
        Params: ConversationParams;
        Reply: ApiResponse<{ markedCount: number }>;
    }>(
        '/conversations/:conversationId/read',
        {
            preHandler: fastify.authenticate,
            schema: {
                params: {
                    type: 'object',
                    required: ['conversationId'],
                    properties: {
                        conversationId: {
                            type: 'string',
                            format: 'uuid',
                        },
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

                const userId = request.user.id;
                const { conversationId } = request.params;

                const markedCount = await markMessagesAsRead(userId, conversationId);

                return reply.status(200).send({
                    success: true,
                    data: {
                        markedCount,
                    },
                });
            } catch (error) {
                if (error instanceof MessageServiceError) {
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
};

export default messagesRoutes;
