/**
 * Global authentication state management using Zustand
 * Handles auth state, session restoration, and token refresh
 * Uses Tauri backend for persistent storage across windows
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { supabase } from '../supabase';
import type { AuthUser } from '../services/auth-service';

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    setAuth: (user: AuthUser, token: string) => Promise<void>;
    clearAuth: () => Promise<void>;
    updateUser: (user: Partial<AuthUser>) => Promise<void>;
    restoreSession: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
    initialize: () => Promise<void>;
}

/**
 * Global authentication store
 * Uses Tauri backend for persistent storage across windows and app restarts
 */
export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,

    /**
     * Set authentication data
     * Stores in Tauri backend (persists to disk)
     */
    setAuth: async (user: AuthUser, token: string) => {
        try {
            // Store in Tauri backend
            await invoke('set_auth', { user, token });

            // Update local state
            set({
                user,
                token,
                isAuthenticated: true,
            });
        } catch (error) {
            console.error('Failed to set auth data:', error);
            throw error;
        }
    },

    /**
     * Clear authentication data
     * Removes from Tauri backend and local state
     */
    clearAuth: async () => {
        try {
            // Clear from Tauri backend
            await invoke('clear_auth');

            // Clear local state
            set({
                user: null,
                token: null,
                isAuthenticated: false,
            });
        } catch (error) {
            console.error('Failed to clear auth data:', error);
            // Still clear local state even if backend fails
            set({
                user: null,
                token: null,
                isAuthenticated: false,
            });
        }
    },

    /**
     * Update user data
     * Updates both backend and local state
     */
    updateUser: async (userData: Partial<AuthUser>) => {
        const currentUser = get().user;
        if (currentUser) {
            const updatedUser = { ...currentUser, ...userData };

            try {
                // Update in Tauri backend
                await invoke('update_user', { userUpdates: updatedUser });

                // Update local state
                set({ user: updatedUser });
            } catch (error) {
                console.error('Failed to update user:', error);
                throw error;
            }
        }
    },

    /**
     * Restore session from Tauri backend
     */
    restoreSession: async () => {
        set({ isLoading: true });

        try {
            // Get user and token from Tauri backend
            const user = await invoke<AuthUser | null>('get_user');
            const token = await invoke<string | null>('get_token');

            if (!user || !token) {
                set({ isLoading: false });
                return;
            }

            // Verify token with Supabase
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

            if (error || !supabaseUser) {
                // Token is invalid, clear auth data
                await get().clearAuth();
                set({ isLoading: false });
                return;
            }

            // Token is valid, restore session
            set({
                user,
                token,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to restore session:', error);
            await get().clearAuth();
            set({ isLoading: false });
        }
    },

    /**
     * Refresh authentication token using Supabase Auth
     */
    refreshToken: async (): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.refreshSession();

            if (error || !data.session) {
                console.error('Token refresh failed:', error);
                await get().clearAuth();
                return false;
            }

            // Update token in state and backend
            const newToken = data.session.access_token;
            const currentUser = get().user;

            if (currentUser) {
                await invoke('set_auth', { user: currentUser, token: newToken });
                set({ token: newToken });
            }

            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            await get().clearAuth();
            return false;
        }
    },

    /**
     * Initialize auth state on app startup
     */
    initialize: async () => {
        if (get().isInitialized) {
            return;
        }

        set({ isLoading: true });

        try {
            // Restore session from Tauri backend
            await get().restoreSession();

            // Set up Supabase auth state listener
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);

                if (event === 'SIGNED_OUT') {
                    await get().clearAuth();
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    // Update token when Supabase auto-refreshes
                    const currentUser = get().user;
                    if (currentUser) {
                        await invoke('set_auth', {
                            user: currentUser,
                            token: session.access_token
                        });
                        set({ token: session.access_token });
                    }
                } else if (event === 'SIGNED_IN' && session) {
                    // Handle sign-in event if needed
                    const currentUser = get().user;
                    if (currentUser) {
                        await invoke('set_auth', {
                            user: currentUser,
                            token: session.access_token
                        });
                        set({ token: session.access_token });
                    }
                }
            });

            set({ isInitialized: true });
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            set({ isLoading: false, isInitialized: true });
        }
    },
}));

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
    return useAuthStore((state) => state.isAuthenticated);
}

/**
 * Hook to get current user
 */
export function useUser(): AuthUser | null {
    return useAuthStore((state) => state.user);
}

/**
 * Hook to get auth loading state
 */
export function useAuthLoading(): boolean {
    return useAuthStore((state) => state.isLoading);
}

/**
 * Hook to get auth initialization state
 */
export function useAuthInitialized(): boolean {
    return useAuthStore((state) => state.isInitialized);
}

/**
 * Protected route guard
 * Returns true if user is authenticated, false otherwise
 */
export function useProtectedRoute(): boolean {
    const isAuthenticated = useIsAuthenticated();
    const isInitialized = useAuthInitialized();

    // Only return authentication status after initialization
    return isInitialized && isAuthenticated;
}
