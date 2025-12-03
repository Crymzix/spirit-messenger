import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
    updateProfile,
    uploadDisplayPicture,
    getProfilePictures,
    setDisplayPicture,
    removeDisplayPicture,
    subscribeToProfileChanges,
    unsubscribeFromProfileChanges,
    type UpdateProfileData,
} from '../services/profile-service';
import { useUser } from './auth-hooks';

/**
 * Hook for updating user profile (display name and/or personal message)
 */
export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateProfileData) => {
            const response = await updateProfile(data);
            return response;
        },
        onSuccess: (data) => {
            // Update query cache
            queryClient.setQueryData(['currentUser'], data.user);
        },
    });
}

/**
 * Hook for uploading display picture
 */
export function useUploadDisplayPicture() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: File) => {
            const response = await uploadDisplayPicture(file);
            return response;
        },
        onSuccess: () => {
            // Invalidate profile pictures to refetch the updated list
            queryClient.invalidateQueries({ queryKey: ['profilePictures'] });
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });
}

/**
 * Hook for fetching user's profile pictures
 */
export function useProfilePictures() {

    return useQuery({
        queryKey: ['profilePictures'],
        queryFn: async () => {
            const response = await getProfilePictures();
            return response.pictures;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook for setting display picture (selecting from existing pictures)
 */
export function useSetDisplayPicture() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (displayPictureUrl: string) => {
            const response = await setDisplayPicture(displayPictureUrl);
            return response;
        },
        onSuccess: (data) => {
            // Update query cache
            queryClient.setQueryData(['currentUser'], data.user);
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });
}

/**
 * Hook for removing display picture
 */
export function useRemoveDisplayPicture() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await removeDisplayPicture();
            return response;
        },
        onSuccess: (data) => {
            // Update query cache
            queryClient.setQueryData(['currentUser'], data.user);
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });
}

/**
 * Hook for subscribing to real-time profile changes via Supabase
 * Automatically subscribes when the component mounts and unsubscribes on unmount
 * Updates the Zustand store and React Query cache when profile changes are detected
 * 
 * This hook should be called in the main application component (e.g., MainWindow)
 * to ensure profile changes are synchronized across all windows and components.
 * 
 * Flow:
 * 1. User updates profile in Options window → calls updateProfile()
 * 2. Backend Service updates Supabase database
 * 3. Supabase Realtime pushes update to all subscribed clients
 * 4. This hook receives the update and refreshes local state
 * 5. All components using useUser() automatically re-render with new data
 */
export function useProfileSubscription() {
    const { data: user } = useUser();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user?.id) {
            return;
        }

        console.log('Setting up profile subscription for user:', user.id);

        // Subscribe to profile changes
        const channel = subscribeToProfileChanges(user.id, (updatedData) => {
            // Update React Query cache
            queryClient.setQueryData(['currentUser'], (oldData: any) => {
                return oldData ? { ...oldData, ...updatedData } : updatedData;
            });

            // Invalidate related queries to trigger refetch if needed
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        });

        // Cleanup: unsubscribe when component unmounts or user changes
        return () => {
            console.log('Cleaning up profile subscription');
            unsubscribeFromProfileChanges(channel);
        };
    }, [user?.id, queryClient]);
}
