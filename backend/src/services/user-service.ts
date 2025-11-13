import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, SelectUser } from '../db/schema.js';

/**
 * User Service
 * Handles user profile updates, presence updates, and display picture management
 */

export interface UpdateProfileData {
    displayName?: string;
    personalMessage?: string;
}

export interface UpdatePresenceData {
    presenceStatus: 'online' | 'away' | 'busy' | 'appear_offline' | 'offline';
}

export interface UpdateDisplayPictureData {
    displayPictureUrl: string;
}

export class UserServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'UserServiceError';
    }
}

/**
 * Update user profile information (display name and personal message)
 */
export async function updateUserProfile(
    userId: string,
    data: UpdateProfileData
): Promise<SelectUser> {
    try {
        // Validate input
        if (!userId) {
            throw new UserServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.displayName && !data.personalMessage) {
            throw new UserServiceError(
                'At least one field (displayName or personalMessage) must be provided',
                'NO_UPDATE_DATA',
                400
            );
        }

        // Validate display name length
        if (data.displayName !== undefined) {
            if (typeof data.displayName !== 'string') {
                throw new UserServiceError('Display name must be a string', 'INVALID_DISPLAY_NAME', 400);
            }
            if (data.displayName.length > 100) {
                throw new UserServiceError(
                    'Display name must not exceed 100 characters',
                    'DISPLAY_NAME_TOO_LONG',
                    400
                );
            }
        }

        // Validate personal message length (150 characters as per requirements)
        if (data.personalMessage !== undefined) {
            if (typeof data.personalMessage !== 'string') {
                throw new UserServiceError('Personal message must be a string', 'INVALID_PERSONAL_MESSAGE', 400);
            }
            if (data.personalMessage.length > 150) {
                throw new UserServiceError(
                    'Personal message must not exceed 150 characters',
                    'PERSONAL_MESSAGE_TOO_LONG',
                    400
                );
            }
        }

        // Update user profile
        const updateData: Partial<SelectUser> = {
            updatedAt: new Date(),
        };

        if (data.displayName !== undefined) {
            updateData.displayName = data.displayName;
        }

        if (data.personalMessage !== undefined) {
            updateData.personalMessage = data.personalMessage;
        }

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
        }

        return updatedUser;
    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }
        throw new UserServiceError(
            'Failed to update user profile',
            'UPDATE_PROFILE_FAILED',
            500
        );
    }
}

/**
 * Update user presence status
 */
export async function updateUserPresence(
    userId: string,
    data: UpdatePresenceData
): Promise<SelectUser> {
    try {
        // Validate input
        if (!userId) {
            throw new UserServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.presenceStatus) {
            throw new UserServiceError('Presence status is required', 'MISSING_PRESENCE_STATUS', 400);
        }

        // Validate presence status
        const validStatuses = ['online', 'away', 'busy', 'appear_offline', 'offline'];
        if (!validStatuses.includes(data.presenceStatus)) {
            throw new UserServiceError(
                `Invalid presence status. Must be one of: ${validStatuses.join(', ')}`,
                'INVALID_PRESENCE_STATUS',
                400
            );
        }

        // Update presence status and last seen timestamp
        const [updatedUser] = await db
            .update(users)
            .set({
                presenceStatus: data.presenceStatus,
                lastSeen: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
        }

        return updatedUser;
    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }
        throw new UserServiceError(
            'Failed to update user presence',
            'UPDATE_PRESENCE_FAILED',
            500
        );
    }
}

/**
 * Update user display picture URL
 */
export async function updateUserDisplayPicture(
    userId: string,
    data: UpdateDisplayPictureData
): Promise<SelectUser> {
    try {
        // Validate input
        if (!userId) {
            throw new UserServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.displayPictureUrl) {
            throw new UserServiceError('Display picture URL is required', 'MISSING_DISPLAY_PICTURE_URL', 400);
        }

        if (typeof data.displayPictureUrl !== 'string') {
            throw new UserServiceError('Display picture URL must be a string', 'INVALID_DISPLAY_PICTURE_URL', 400);
        }

        // Basic URL validation
        try {
            new URL(data.displayPictureUrl);
        } catch {
            throw new UserServiceError('Display picture URL must be a valid URL', 'INVALID_URL_FORMAT', 400);
        }

        // Update display picture URL
        const [updatedUser] = await db
            .update(users)
            .set({
                displayPictureUrl: data.displayPictureUrl,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
        }

        return updatedUser;
    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }
        throw new UserServiceError(
            'Failed to update display picture',
            'UPDATE_DISPLAY_PICTURE_FAILED',
            500
        );
    }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<SelectUser | null> {
    try {
        if (!userId) {
            throw new UserServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        return user || null;
    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }
        throw new UserServiceError(
            'Failed to get user',
            'GET_USER_FAILED',
            500
        );
    }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<SelectUser | null> {
    try {
        if (!email) {
            throw new UserServiceError('Email is required', 'INVALID_EMAIL', 400);
        }

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        return user || null;
    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }
        throw new UserServiceError(
            'Failed to get user by email',
            'GET_USER_BY_EMAIL_FAILED',
            500
        );
    }
}
