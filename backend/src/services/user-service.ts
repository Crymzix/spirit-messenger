import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, SelectUser, userProfilePictures, SelectUserProfilePicture, InsertUserProfilePicture } from '../db/schema.js';
import { PresenceStatus } from '../types/index.js';

/**
 * User Service
 * Handles user profile updates, presence updates, and display picture management
 */

export interface UpdateProfileData {
    displayName?: string;
    personalMessage?: string;
    displayPictureUrl?: string | null;
}

export interface UpdatePresenceData {
    presenceStatus: PresenceStatus
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

        if (data.displayName === undefined && data.personalMessage === undefined && data.displayPictureUrl === undefined) {
            throw new UserServiceError(
                'At least one field (displayName, personalMessage, or displayPictureUrl) must be provided',
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

        // Validate display picture URL if provided
        if (data.displayPictureUrl !== undefined && data.displayPictureUrl !== null) {
            if (typeof data.displayPictureUrl !== 'string') {
                throw new UserServiceError('Display picture URL must be a string or null', 'INVALID_DISPLAY_PICTURE_URL', 400);
            }
            // Basic URL validation - allow both absolute URLs and relative paths
            // Relative paths start with / or .
            const isRelativePath = data.displayPictureUrl.startsWith('/') || data.displayPictureUrl.startsWith('./');
            if (!isRelativePath) {
                try {
                    new URL(data.displayPictureUrl);
                } catch {
                    throw new UserServiceError('Display picture URL must be a valid URL or relative path', 'INVALID_URL_FORMAT', 400);
                }
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

        if (data.displayPictureUrl !== undefined) {
            updateData.displayPictureUrl = data.displayPictureUrl;
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
        const validStatuses = ['online', 'away', 'busy', 'be_right_back', 'on_the_phone', 'out_to_lunch', 'appear_offline', 'offline'];
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

/**
 * Save a user profile picture to the database
 */
export async function saveUserProfilePicture(
    userId: string,
    fileName: string,
    pictureUrl: string,
    storagePath: string
): Promise<SelectUserProfilePicture> {
    try {
        if (!userId) {
            throw new UserServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!fileName) {
            throw new UserServiceError('File name is required', 'MISSING_FILE_NAME', 400);
        }

        if (!pictureUrl) {
            throw new UserServiceError('Picture URL is required', 'MISSING_PICTURE_URL', 400);
        }

        if (!storagePath) {
            throw new UserServiceError('Storage path is required', 'MISSING_STORAGE_PATH', 400);
        }

        const pictureData: InsertUserProfilePicture = {
            userId,
            fileName,
            pictureUrl,
            storagePath,
        };

        const [savedPicture] = await db
            .insert(userProfilePictures)
            .values(pictureData)
            .returning();

        if (!savedPicture) {
            throw new UserServiceError('Failed to save profile picture', 'SAVE_PICTURE_FAILED', 500);
        }

        return savedPicture;
    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }
        throw new UserServiceError(
            'Failed to save profile picture',
            'SAVE_PICTURE_FAILED',
            500
        );
    }
}

/**
 * Get all profile pictures for a user, ordered by upload date (newest first)
 */
export async function getUserProfilePictures(userId: string): Promise<SelectUserProfilePicture[]> {
    try {
        if (!userId) {
            throw new UserServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        const pictures = await db
            .select()
            .from(userProfilePictures)
            .where(eq(userProfilePictures.userId, userId))
            .orderBy(desc(userProfilePictures.uploadedAt));

        return pictures;
    } catch (error) {
        if (error instanceof UserServiceError) {
            throw error;
        }
        throw new UserServiceError(
            'Failed to get profile pictures',
            'GET_PICTURES_FAILED',
            500
        );
    }
}
