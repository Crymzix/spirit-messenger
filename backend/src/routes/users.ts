import { FastifyPluginAsync } from 'fastify';
import sharp from 'sharp';
import { supabase } from '../lib/supabase.js';
import {
    updateUserProfile,
    updateUserPresence,
    updateUserDisplayPicture,
    UserServiceError,
    UpdateProfileData,
    UpdatePresenceData,
} from '../services/user-service.js';
import type { ApiResponse, UserProfile } from '../types/index.js';

const usersRoutes: FastifyPluginAsync = async (fastify) => {
    // PUT /api/users/profile
    fastify.put<{
        Body: UpdateProfileData;
        Reply: ApiResponse<{ user: UserProfile }>;
    }>(
        '/profile',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        displayName: { type: 'string', minLength: 1, maxLength: 100 },
                        personalMessage: { type: 'string', maxLength: 150 }
                    },
                    anyOf: [
                        { required: ['displayName'] },
                        { required: ['personalMessage'] }
                    ]
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { displayName, personalMessage } = request.body;

                // Update user profile using service
                const updatedUser = await updateUserProfile(userId, {
                    displayName,
                    personalMessage
                });

                return reply.status(200).send({
                    success: true,
                    data: {
                        user: {
                            id: updatedUser.id,
                            email: updatedUser.email,
                            username: updatedUser.username,
                            displayName: updatedUser.displayName,
                            personalMessage: updatedUser.personalMessage,
                            displayPictureUrl: updatedUser.displayPictureUrl,
                            presenceStatus: updatedUser.presenceStatus as 'online' | 'away' | 'busy' | 'appear_offline' | 'offline',
                            lastSeen: updatedUser.lastSeen,
                            createdAt: updatedUser.createdAt!,
                            updatedAt: updatedUser.updatedAt!
                        }
                    }
                });
            } catch (error) {
                if (error instanceof UserServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/users/display-picture
    fastify.post<{
        Reply: ApiResponse<{ displayPictureUrl: string }>;
    }>(
        '/display-picture',
        {
            preHandler: fastify.authenticate
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;

                // Get uploaded file
                const data = await request.file();

                if (!data) {
                    return reply.status(400).send({
                        success: false,
                        error: 'No file uploaded'
                    });
                }

                // Validate file type
                const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                if (!allowedMimeTypes.includes(data.mimetype)) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid file type. Only JPEG and PNG images are allowed'
                    });
                }

                // Validate file size (5 MB max for display pictures)
                const maxSize = 5 * 1024 * 1024; // 5 MB
                const buffer = await data.toBuffer();

                if (buffer.length > maxSize) {
                    return reply.status(400).send({
                        success: false,
                        error: 'File size exceeds 5 MB limit'
                    });
                }

                // Process image with sharp: resize to 96x96 pixels
                let processedBuffer: Buffer;
                try {
                    processedBuffer = await sharp(buffer)
                        .resize(96, 96, {
                            fit: 'cover',
                            position: 'center'
                        })
                        .jpeg({ quality: 90 }) // Convert to JPEG for consistency
                        .toBuffer();
                } catch (sharpError) {
                    fastify.log.error({ error: sharpError }, 'Image processing error');
                    return reply.status(400).send({
                        success: false,
                        error: 'Failed to process image'
                    });
                }

                // Generate unique filename (always use .jpg after processing)
                const filename = `${userId}-${Date.now()}.jpg`;
                const storagePath = `display-pictures/${filename}`;

                // Upload processed image to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('display-pictures')
                    .upload(storagePath, processedBuffer, {
                        contentType: 'image/jpeg',
                        upsert: false
                    });

                if (uploadError) {
                    fastify.log.error({ error: uploadError }, 'Supabase storage upload error');
                    return reply.status(500).send({
                        success: false,
                        error: 'Failed to upload image'
                    });
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('display-pictures')
                    .getPublicUrl(storagePath);

                const displayPictureUrl = urlData.publicUrl;

                // Update user record with new display picture URL
                const updatedUser = await updateUserDisplayPicture(userId, {
                    displayPictureUrl
                });

                return reply.status(200).send({
                    success: true,
                    data: {
                        displayPictureUrl: updatedUser.displayPictureUrl!
                    }
                });
            } catch (error) {
                if (error instanceof UserServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // PUT /api/users/presence
    fastify.put<{
        Body: UpdatePresenceData;
        Reply: ApiResponse<{ user: UserProfile }>;
    }>(
        '/presence',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['presenceStatus'],
                    properties: {
                        presenceStatus: {
                            type: 'string',
                            enum: ['online', 'away', 'busy', 'appear_offline', 'offline']
                        }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { presenceStatus } = request.body;

                // Update user presence using service
                const updatedUser = await updateUserPresence(userId, {
                    presenceStatus
                });

                return reply.status(200).send({
                    success: true,
                    data: {
                        user: {
                            id: updatedUser.id,
                            email: updatedUser.email,
                            username: updatedUser.username,
                            displayName: updatedUser.displayName,
                            personalMessage: updatedUser.personalMessage,
                            displayPictureUrl: updatedUser.displayPictureUrl,
                            presenceStatus: updatedUser.presenceStatus as 'online' | 'away' | 'busy' | 'appear_offline' | 'offline',
                            lastSeen: updatedUser.lastSeen,
                            createdAt: updatedUser.createdAt || new Date(),
                            updatedAt: updatedUser.updatedAt || new Date()
                        }
                    }
                });
            } catch (error) {
                if (error instanceof UserServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );
};

export default usersRoutes;
