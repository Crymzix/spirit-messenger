/**
 * React Query hooks for authentication
 * Integrates with Zustand auth store for global state management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../api-client';
import { useAuthStore } from '../store/auth-store';
import {
    getStoredToken,
    type RegisterData,
    type LoginData,
    type AuthResponse,
} from '../services/auth-service';

/**
 * Hook to get current user from Zustand store
 */
export function useCurrentUser() {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            if (!user) {
                throw new Error('No authenticated user');
            }
            return user;
        },
        enabled: isAuthenticated,
        staleTime: Infinity, // User data doesn't change unless we update it
        initialData: user || undefined,
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
            // Update Zustand store
            useAuthStore.getState().setAuth(data.user, data.token);

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
            // Update Zustand store
            useAuthStore.getState().setAuth(data.user, data.token);

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
            const token = getStoredToken();

            if (token) {
                // Call backend logout endpoint
                const response = await apiPost<{ message: string }>(
                    '/api/auth/logout',
                    {},
                    token
                );

                if (!response.success) {
                    console.error('Backend logout failed:', response.error);
                }
            }

            return { success: true };
        },
        onSuccess: () => {
            // Clear Zustand store
            useAuthStore.getState().clearAuth();

            // Clear query cache
            queryClient.setQueryData(['currentUser'], null);
            queryClient.clear();
        },
    });
}


export { isAuthenticated, getStoredToken, getStoredUser, clearAuthData } from '../services/auth-service';
export {
    useIsAuthenticated,
    useUser,
    useAuthLoading,
    useAuthInitialized,
    useProtectedRoute,
} from '../store/auth-store';
