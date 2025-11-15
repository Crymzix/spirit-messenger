/**
 * Profile service for user profile management
 * Handles profile updates and display picture uploads
 * Subscribes to real-time profile changes via Supabase
 * 
 * Architecture:
 * - Write operations: All profile updates go through Backend Service API
 * - Read operations: Frontend reads directly from Supabase for real-time updates
 * - Real-time sync: Supabase Realtime WebSocket subscriptions notify UI of changes
 * 
 * Usage:
 * 1. Call updateProfile() to send changes to Backend Service
 * 2. Backend Service updates Supabase database
 * 3. Supabase Realtime triggers subscription callback
 * 4. Callback updates Zustand store and React Query cache
 * 5. UI automatically re-renders with new data
 */

import { apiPut, apiGet, createAuthHeaders } from '../api-client';
import { supabase } from '../supabase';
import type { User } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UpdateProfileData {
    displayName?: string;
    personalMessage?: string;
}

export interface UpdateProfileResponse {
    user: User;
}

export interface UploadDisplayPictureResponse {
    displayPictureUrl: string;
}

export interface UserProfilePicture {
    id: string;
    userId: string;
    fileName: string;
    pictureUrl: string;
    storagePath: string;
    uploadedAt: string;
}

export interface GetProfilePicturesResponse {
    pictures: UserProfilePicture[];
}

export type ProfileChangeCallback = (user: Partial<User>) => void;

/**
 * Update user profile (display name and/or personal message)
 */
export async function updateProfile(
    data: UpdateProfileData
): Promise<UpdateProfileResponse> {
    const response = await apiPut<{ user: User }>(
        '/api/users/profile',
        data
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update profile');
    }

    return response.data;
}

/**
 * Upload display picture to Backend Service
 * Validates file type and size before uploading
 */
export async function uploadDisplayPicture(
    file: File
): Promise<UploadDisplayPictureResponse> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG and PNG images are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB');
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);

    // Get API base URL
    const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:6666';
    const url = `${API_BASE_URL}/api/users/display-picture`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: createAuthHeaders(),
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error ${response.status}`);
        }

        if (!data.success || !data.data) {
            throw new Error(data.error || 'Failed to upload display picture');
        }

        return data.data;
    } catch (error) {
        console.error('Display picture upload failed:', error);
        throw error instanceof Error ? error : new Error('Network error');
    }
}

/**
 * Get all profile pictures for the current user
 */
export async function getProfilePictures(): Promise<GetProfilePicturesResponse> {
    const response = await apiGet<GetProfilePicturesResponse>(
        '/api/users/profile-pictures'
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch profile pictures');
    }

    return response.data;
}

/**
 * Set the user's display picture URL (for selecting from existing pictures)
 */
export async function setDisplayPicture(
    displayPictureUrl: string
): Promise<UpdateProfileResponse> {
    const response = await apiPut<{ user: User }>(
        '/api/users/profile',
        { displayPictureUrl }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to set display picture');
    }

    return response.data;
}

/**
 * Remove the user's display picture
 */
export async function removeDisplayPicture(): Promise<UpdateProfileResponse> {
    // Get API base URL
    const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:6666';
    const url = `${API_BASE_URL}/api/users/display-picture`;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                ...createAuthHeaders(),
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error ${response.status}`);
        }

        if (!data.success || !data.data) {
            throw new Error(data.error || 'Failed to remove display picture');
        }

        return data.data;
    } catch (error) {
        console.error('Remove display picture failed:', error);
        throw error instanceof Error ? error : new Error('Network error');
    }
}

/**
 * Subscribe to user profile changes via Supabase Realtime
 * Listens for updates to the user's profile and triggers callback
 * 
 * @param userId - The ID of the user to subscribe to
 * @param callback - Function to call when profile changes are detected
 * @returns RealtimeChannel that can be unsubscribed
 */
export function subscribeToProfileChanges(
    userId: string,
    callback: ProfileChangeCallback
): RealtimeChannel {
    const channel = supabase
        .channel(`profile:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${userId}`,
            },
            (payload) => {
                console.log('Profile change detected:', payload);

                // Extract the updated user data from the payload
                const updatedData = payload.new as any;

                // Convert snake_case database fields to camelCase
                const userUpdate: Partial<User> = {
                    id: updatedData.id,
                    email: updatedData.email,
                    username: updatedData.username,
                    displayName: updatedData.display_name || '',
                    personalMessage: updatedData.personal_message || '',
                    displayPictureUrl: updatedData.display_picture_url || '',
                    presenceStatus: updatedData.presence_status || 'offline',
                    lastSeen: updatedData.last_seen ? new Date(updatedData.last_seen) : new Date(),
                    createdAt: updatedData.created_at ? new Date(updatedData.created_at) : new Date(),
                    updatedAt: updatedData.updated_at ? new Date(updatedData.updated_at) : new Date(),
                };

                // Trigger the callback with the updated user data
                callback(userUpdate);
            }
        )
        .subscribe((status) => {
            console.log(`Profile subscription status: ${status}`);
        });

    return channel;
}

/**
 * Unsubscribe from profile changes
 * Cleans up the Supabase Realtime channel
 * 
 * @param channel - The RealtimeChannel to unsubscribe
 */
export async function unsubscribeFromProfileChanges(
    channel: RealtimeChannel
): Promise<void> {
    await supabase.removeChannel(channel);
    console.log('Unsubscribed from profile changes');
}
