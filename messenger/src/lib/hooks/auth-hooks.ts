import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../api-client';
import {
    type RegisterData,
    type LoginData,
    type AuthResponse,
    AuthUser,
} from '../services/auth-service';
import { supabase } from '../supabase';

/**
 * Hook to get current user from Zustand store
 */
export function useUser() {

    return useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const { data: profile } = await apiGet<AuthResponse>('/api/auth/me')
            if (!profile || !profile.user) {
                return null
            }

            const currentUser = profile.user
            const user: AuthUser = {
                id: currentUser.id,
                email: currentUser.email || '',
                username: currentUser.username || '',
                displayName: currentUser?.displayName || '',
                personalMessage: currentUser?.personalMessage,
                displayPictureUrl: currentUser?.displayPictureUrl,
                presenceStatus: currentUser?.presenceStatus,
            };
            return user || null;
        },
        staleTime: Infinity,
    });
}

/**
 * Hook for user sign-up
 */
export function useSignUp() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: RegisterData) => {
            const response = await apiPost<AuthResponse>('/api/auth/register', data);

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to sign up');
            }

            return response.data;
        },
        onSuccess: (data) => {
            supabase.auth.setSession({
                access_token: data.token,
                refresh_token: data.refreshToken,
            });

            // Update query cache
            queryClient.setQueryData(['currentUser'], data.user);
        },
    });
}

/**
 * Hook for user sign-in
 */
export function useSignIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: LoginData) => {
            const response = await apiPost<AuthResponse>('/api/auth/login', data);

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to sign in');
            }

            return response.data;
        },
        onSuccess: (data) => {
            supabase.auth.setSession({
                access_token: data.token,
                refresh_token: data.refreshToken,
            });

            // Update query cache
            queryClient.setQueryData(['currentUser'], data.user);
        },
    });
}

/**
 * Hook for user sign-out
 */
export function useSignOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.auth.signOut()
            if (error) {
                console.error('Backend logout failed:', error);
                throw error
            }

            return { success: true };
        },
        onSuccess: () => {
            // Clear query cache
            queryClient.setQueryData(['currentUser'], null);
            queryClient.clear();
        },
        onError: (error) => {
            console.error(error)
        }
    });
}

