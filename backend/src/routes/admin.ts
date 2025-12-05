/**
 * Admin Routes
 *
 * Admin-only endpoints for managing AI bots and system configuration.
 * Requires ADMIN_API_KEY authentication.
 */

import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { users, botConfigs, botAutonomousSchedules } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getSupabase } from '../lib/supabase.js';
import type { ApiResponse } from '../types/index.js';

interface CreateBotAdminBody {
    username: string;
    displayName: string;
    personalityTemplate: string;
    personalMessage?: string;
    customPersonalityConfig?: Record<string, any>;
    displayPictureUrl?: string;
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
    voiceClipProbability?: number;
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/admin/bots - Create a new AI bot (Admin only)
    fastify.post<{
        Body: CreateBotAdminBody;
        Reply: ApiResponse<{ bot: any }>;
    }>(
        '/bots',
        {
            preHandler: fastify.authenticateAdmin,
            schema: {
                body: {
                    type: 'object',
                    required: ['username', 'displayName', 'personalityTemplate'],
                    properties: {
                        username: { type: 'string', minLength: 3, maxLength: 50 },
                        displayName: { type: 'string', minLength: 1, maxLength: 100 },
                        personalityTemplate: { type: 'string' },
                        personalMessage: { type: 'string', maxLength: 150 },
                        customPersonalityConfig: { type: 'object' },
                        displayPictureUrl: { type: 'string' },
                        responseDelayMin: { type: 'number', minimum: 0 },
                        responseDelayMax: { type: 'number', minimum: 0 },
                        typingSpeed: { type: 'number', minimum: 1 },
                        autonomousMessagingEnabled: { type: 'boolean' },
                        autonomousIntervalMin: { type: 'number', minimum: 0 },
                        autonomousIntervalMax: { type: 'number', minimum: 0 },
                        ignoreMessageProbability: { type: 'number', minimum: 0, maximum: 1 },
                        nudgeProbability: { type: 'number', minimum: 0, maximum: 1 },
                        emoticonUsageFrequency: { type: 'number', minimum: 0, maximum: 1 },
                        webSearchEnabled: { type: 'boolean' },
                        voiceClipProbability: { type: 'number', minimum: 0, maximum: 1 },
                    },
                },
            },
        },
        async (request, reply) => {
            try {
                const {
                    username,
                    displayName,
                    personalityTemplate,
                    personalMessage,
                    customPersonalityConfig,
                    displayPictureUrl,
                    responseDelayMin,
                    responseDelayMax,
                    typingSpeed,
                    autonomousMessagingEnabled,
                    autonomousIntervalMin,
                    autonomousIntervalMax,
                    ignoreMessageProbability,
                    nudgeProbability,
                    emoticonUsageFrequency,
                    webSearchEnabled,
                    voiceClipProbability,
                } = request.body;

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
                    personalMessage: personalMessage || '',
                    displayPictureUrl: displayPictureUrl || '/default-profile-pictures/robot.png',
                    isAiBot: true,
                    presenceStatus: 'online',
                }).returning();

                // Create bot config with provided parameters or defaults
                const [config] = await db.insert(botConfigs).values({
                    userId: user.id,
                    personalityTemplate,
                    customPersonalityConfig: customPersonalityConfig || null,
                    responseDelayMin: responseDelayMin ?? 1000,
                    responseDelayMax: responseDelayMax ?? 5000,
                    typingSpeed: typingSpeed ?? 50,
                    autonomousMessagingEnabled: autonomousMessagingEnabled ?? false,
                    autonomousIntervalMin: autonomousIntervalMin ?? 300000,
                    autonomousIntervalMax: autonomousIntervalMax ?? 1800000,
                    ignoreMessageProbability: ignoreMessageProbability ?? 0.05,
                    nudgeProbability: nudgeProbability ?? 0.05,
                    emoticonUsageFrequency: emoticonUsageFrequency ?? 0.3,
                    webSearchEnabled: webSearchEnabled ?? false,
                    voiceClipProbability: voiceClipProbability ?? 0.1,
                }).returning();

                // Create autonomous schedule
                await db.insert(botAutonomousSchedules).values({
                    botUserId: user.id,
                });

                fastify.log.info(`Admin created bot: ${displayName} (${username})`);

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
                fastify.log.error(error, 'Error creating bot via admin API');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to create bot',
                });
            }
        }
    );

    // GET /api/admin/bots - List all bots (Admin only)
    fastify.get<{
        Reply: ApiResponse<{ bots: any[]; total: number }>;
    }>(
        '/bots',
        {
            preHandler: fastify.authenticateAdmin,
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
                        total: botList.length,
                    },
                });
            } catch (error) {
                fastify.log.error(error, 'Error listing bots via admin API');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to list bots',
                });
            }
        }
    );

    // GET /api/admin/bots/:botId - Get a specific bot (Admin only)
    fastify.get<{
        Params: { botId: string };
        Reply: ApiResponse<{ bot: any }>;
    }>(
        '/bots/:botId',
        {
            preHandler: fastify.authenticateAdmin,
        },
        async (request, reply) => {
            try {
                const { botId } = request.params;

                const [botData] = await db
                    .select({
                        user: users,
                        config: botConfigs,
                    })
                    .from(users)
                    .innerJoin(botConfigs, eq(users.id, botConfigs.userId))
                    .where(eq(users.id, botId))
                    .limit(1);

                if (!botData) {
                    return reply.status(404).send({
                        success: false,
                        error: 'Bot not found',
                    });
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        bot: {
                            ...botData.user,
                            config: botData.config,
                        },
                    },
                });
            } catch (error) {
                fastify.log.error(error, 'Error getting bot via admin API');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to get bot',
                });
            }
        }
    );

    // DELETE /api/admin/bots/:botId - Delete a bot (Admin only)
    fastify.delete<{
        Params: { botId: string };
        Reply: ApiResponse<{ success: boolean }>;
    }>(
        '/bots/:botId',
        {
            preHandler: fastify.authenticateAdmin,
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

                fastify.log.info(`Admin deleted bot: ${botId}`);

                return reply.status(200).send({
                    success: true,
                    data: { success: true },
                });
            } catch (error) {
                fastify.log.error(error, 'Error deleting bot via admin API');
                return reply.status(500).send({
                    success: false,
                    error: 'Failed to delete bot',
                });
            }
        }
    );
};

export default adminRoutes;
