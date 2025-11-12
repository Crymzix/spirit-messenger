import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../lib/supabase.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { RegisterRequest, LoginRequest, AuthResponse, ApiResponse } from '../types/index.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/auth/register
    fastify.post<{
        Body: RegisterRequest;
        Reply: ApiResponse<AuthResponse>;
    }>(
        '/register',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['email', 'password', 'username', 'displayName'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 6 },
                        username: { type: 'string', minLength: 3, maxLength: 30 },
                        displayName: { type: 'string', minLength: 1, maxLength: 100 }
                    }
                }
            }
        },
        async (request, reply) => {
            const { email, password, username, displayName } = request.body;

            try {
                // Check if username already exists
                const existingUser = await db
                    .select()
                    .from(users)
                    .where(eq(users.username, username))
                    .limit(1);

                if (existingUser.length > 0) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Username already exists'
                    });
                }

                // Create user with Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError || !authData.user) {
                    return reply.status(400).send({
                        success: false,
                        error: authError?.message || 'Failed to create account'
                    });
                }

                // Create user profile in database
                const [newUser] = await db
                    .insert(users)
                    .values({
                        id: authData.user.id,
                        email,
                        username,
                        displayName,
                        presenceStatus: 'offline'
                    })
                    .returning();

                // Get session token
                const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (sessionError || !sessionData.session) {
                    return reply.status(500).send({
                        success: false,
                        error: 'Account created but failed to generate session'
                    });
                }

                return reply.status(201).send({
                    success: true,
                    data: {
                        token: sessionData.session.access_token,
                        user: {
                            id: newUser.id,
                            email: newUser.email,
                            username: newUser.username,
                            displayName: newUser.displayName
                        }
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/auth/login
    fastify.post<{
        Body: LoginRequest;
        Reply: ApiResponse<AuthResponse>;
    }>(
        '/login',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 1 }
                    }
                }
            }
        },
        async (request, reply) => {
            const { email, password } = request.body;

            try {
                // Sign in with Supabase Auth
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error || !data.session || !data.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Invalid email or password'
                    });
                }

                // Get user profile from database
                const [userProfile] = await db
                    .select()
                    .from(users)
                    .where(eq(users.id, data.user.id))
                    .limit(1);

                if (!userProfile) {
                    return reply.status(404).send({
                        success: false,
                        error: 'User profile not found'
                    });
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        token: data.session.access_token,
                        user: {
                            id: userProfile.id,
                            email: userProfile.email,
                            username: userProfile.username,
                            displayName: userProfile.displayName
                        }
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/auth/logout
    fastify.post<{
        Reply: ApiResponse<{ message: string }>;
    }>(
        '/logout',
        {
            preHandler: fastify.authenticate
        },
        async (request, reply) => {
            try {
                // Get token from authorization header
                const token = request.headers.authorization?.split(' ')[1];

                if (!token) {
                    return reply.status(401).send({
                        success: false,
                        error: 'No token provided'
                    });
                }

                // Sign out from Supabase Auth
                const { error } = await supabase.auth.signOut();

                if (error) {
                    fastify.log.error(error);
                    return reply.status(500).send({
                        success: false,
                        error: 'Failed to sign out'
                    });
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        message: 'Successfully signed out'
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );
};

export default authRoutes;
