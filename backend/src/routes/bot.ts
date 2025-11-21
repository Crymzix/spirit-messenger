/**
 * Bot Routes
 *
 * Handles bot-related API endpoints including the webhook for message triggers
 * and CRUD operations for bot management.
 */

import { FastifyPluginAsync } from 'fastify';
import { handleIncomingMessage, getBotWithConfig } from '../services/bot-service.js';
import { queueBotResponse } from '../config/queue.js';
import { getAllPersonalityTemplates } from '../services/personality-service.js';
import { db } from '../db/client.js';
import { users, botConfigs, botAutonomousSchedules } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getSupabase } from '../lib/supabase.js';
import type { ApiResponse } from '../types/index.js';

interface InsertMessagePayload {
    type: 'INSERT'
    table: string
    schema: string
    record: {
        id: string
        sender_id: string
    }
    old_record: null
}

interface CreateBotBody {
    username: string;
    displayName: string;
    personalityTemplate: string;
    customPersonalityConfig?: Record<string, any>;
    displayPictureUrl?: string;
}

interface UpdateBotConfigBody {
    personalityTemplate?: string;
    customPersonalityConfig?: Record<string, any>;
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
}

const botRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/bot/handle-message - Handle incoming message for bot response
    // Called by Supabase Database Webhook on message INSERT
    fastify.post<{
        Body: InsertMessagePayload;
        Reply: ApiResponse<{ queued: boolean; delay?: number }>;
    }>(
        '/bot/handle-message',
        async (request, reply) => {
            try {
                const { record } = request.body;
                const { id, sender_id } = record;

                // Check if the sender is a bot (bots shouldn't trigger other bots)
                const [sender] = await db
                    .select({ isAiBot: users.isAiBot })
                    .from(users)
                    .where(eq(users.id, sender_id))
                    .limit(1);

                if (sender?.isAiBot) {
                    return reply.status(200).send({
                        success: true,
                        data: {
                            queued: false,
                        },
                    });
                }

                // Handle the incoming message
                const queuedResponse = await handleIncomingMessage(id);

                if (!queuedResponse) {
                    return reply.status(200).send({
                        success: true,
                        data: {
                            queued: false,
                        },
                    });
                }

                // Queue the bot response
                await queueBotResponse({
                    botUserId: queuedResponse.botUserId,
                    conversationId: queuedResponse.conversationId,
                    content: queuedResponse.content,
                    emoticons: queuedResponse.emoticons,
                    typingDuration: queuedResponse.typingDuration,
                    shouldNudge: queuedResponse.shouldNudge,
                }, queuedResponse.delay);

                fastify.log.info(
                    `Queued bot response for message ${id} with ${queuedResponse.delay}ms delay`
                );

                return reply.status(200).send({
                    success: true,
                    data: {
                        queued: true,
                        delay: queuedResponse.delay,
                    },
                });
            } catch (error) {
                fastify.log.error(error, 'Error handling message for bot');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to process message for bot',
                });
            }
        }
    );

    // GET /api/bot/personalities - Get all available personality templates
    fastify.get<{
        Reply: ApiResponse<{ personalities: any[] }>;
    }>(
        '/bot/personalities',
        async (_request, reply) => {
            const personalities = getAllPersonalityTemplates();
            return reply.status(200).send({
                success: true,
                data: { personalities },
            });
        }
    );

    // GET /api/bots - List all bots
    fastify.get<{
        Reply: ApiResponse<{ bots: any[] }>;
    }>(
        '/bots',
        {
            preHandler: fastify.authenticate,
        },
        async (_request, reply) => {
            try {
                const botList = await db
                    .select({
                        user: users,
                        config: botConfigs,
                    })
                    .from(users)
                    .innerJoin(botConfigs, eq(users.id, botConfigs.userId))
                    .where(eq(users.isAiBot, true));

                return reply.status(200).send({
                    success: true,
                    data: {
                        bots: botList.map(b => ({
                            ...b.user,
                            config: b.config,
                        })),
                    },
                });
            } catch (error) {
                fastify.log.error(error, 'Error listing bots');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to list bots',
                });
            }
        }
    );

    // GET /api/bots/:botId - Get a specific bot
    fastify.get<{
        Params: { botId: string };
        Reply: ApiResponse<{ bot: any }>;
    }>(
        '/bots/:botId',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                const { botId } = request.params;
                const bot = await getBotWithConfig(botId);

                if (!bot) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Bot not found',
                    });
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        bot: {
                            ...bot.user,
                            config: bot.config,
                            personality: bot.personality,
                        },
                    },
                });
            } catch (error) {
                fastify.log.error(error, 'Error getting bot');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to get bot',
                });
            }
        }
    );

    // POST /api/bots - Create a new bot
    fastify.post<{
        Body: CreateBotBody;
        Reply: ApiResponse<{ bot: any }>;
    }>(
        '/bots',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['username', 'displayName', 'personalityTemplate'],
                    properties: {
                        username: { type: 'string', minLength: 3, maxLength: 50 },
                        displayName: { type: 'string', minLength: 1, maxLength: 100 },
                        personalityTemplate: { type: 'string' },
                        customPersonalityConfig: { type: 'object' },
                        displayPictureUrl: { type: 'string' },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const { username, displayName, personalityTemplate, customPersonalityConfig, displayPictureUrl } = request.body;

                // Create user in Supabase Auth
                const supabase = getSupabase();
                const email = `${username}@bot.local`;
                const password = crypto.randomUUID();

                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                });

                if (authError) {
                    return reply.status(400).send({
                        success: false,
                        error: `Failed to create bot user: ${authError.message}`,
                    });
                }

                // Create user record
                const [user] = await db.insert(users).values({
                    id: authUser.user.id,
                    email,
                    username,
                    displayName,
                    displayPictureUrl: displayPictureUrl || '/default-profile-pictures/robot.png',
                    isAiBot: true,
                    presenceStatus: 'online',
                }).returning();

                // Create bot config
                const [config] = await db.insert(botConfigs).values({
                    userId: user.id,
                    personalityTemplate,
                    customPersonalityConfig: customPersonalityConfig || null,
                }).returning();

                // Create autonomous schedule
                await db.insert(botAutonomousSchedules).values({
                    botUserId: user.id,
                });

                return reply.status(201).send({
                    success: true,
                    data: {
                        bot: {
                            ...user,
                            config,
                        },
                    },
                });
            } catch (error) {
                fastify.log.error(error, 'Error creating bot');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to create bot',
                });
            }
        }
    );

    // PUT /api/bots/:botId/config - Update bot configuration
    fastify.put<{
        Params: { botId: string };
        Body: UpdateBotConfigBody;
        Reply: ApiResponse<{ config: any }>;
    }>(
        '/bots/:botId/config',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                const { botId } = request.params;
                const updates = request.body;

                const [config] = await db
                    .update(botConfigs)
                    .set(updates)
                    .where(eq(botConfigs.userId, botId))
                    .returning();

                if (!config) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Bot config not found',
                    });
                }

                return reply.status(200).send({
                    success: true,
                    data: { config },
                });
            } catch (error) {
                fastify.log.error(error, 'Error updating bot config');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to update bot config',
                });
            }
        }
    );

    // DELETE /api/bots/:botId - Delete a bot
    fastify.delete<{
        Params: { botId: string };
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/bots/:botId',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                const { botId } = request.params;

                // Delete user (cascades to config, schedules, etc.)
                const [deleted] = await db
                    .delete(users)
                    .where(eq(users.id, botId))
                    .returning();

                if (!deleted) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Bot not found',
                    });
                }

                // Also delete from Supabase Auth
                const supabase = getSupabase();
                await supabase.auth.admin.deleteUser(botId);

                return reply.status(200).send({
                    success: true,
                    data: { success: true },
                });
            } catch (error) {
                fastify.log.error(error, 'Error deleting bot');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to delete bot',
                });
            }
        }
    );
};

export default botRoutes;
