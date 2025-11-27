/**
 * Global authentication state management using Zustand
 * Handles auth state, session restoration, and token refresh
 * Uses Tauri backend for persistent storage across windows
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { supabase } from '../supabase';
import type { AuthUser } from '../services/auth-service';
import type { AuthPreferences } from '../types/auth-preferences';

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;
    refreshInterval: number | null;
    authPreferences: AuthPreferences | null;

    // Actions
    setAuth: (user: AuthUser, token: string, refreshToken: string) => Promise<void>;
    clearAuth: (preservePreferences?: boolean) => Promise<void>;
    updateUser: (user: Partial<AuthUser>) => Promise<void>;
    restoreSession: () => Promise<void>;
    refreshAccessToken: () => Promise<boolean>;
    initialize: () => Promise<void>;
    startTokenRefreshInterval: () => void;
    stopTokenRefreshInterval: () => void;
    saveAuthPreferences: (prefs: AuthPreferences, email: string, password: string) => Promise<void>;
    loadAuthPreferences: () => Promise<AuthPreferences | null>;
}

/**
 * Global authentication store
 * Uses Tauri backend for persistent storage across windows and app restarts
 */
export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    refreshInterval: null,
    authPreferences: null,

    /**
     * Set authentication data
     * Stores in Tauri backend (persists to disk)
     * Sets Supabase session for automatic token refresh
     */
    setAuth: async (user: AuthUser, token: string, refreshToken: string) => {
        try {
            await invoke('set_auth', { user, token, refreshToken });

            // Set Supabase session to enable automatic token refresh
            await supabase.auth.setSession({
                access_token: token,
                refresh_token: refreshToken,
            });

            // Update local state
            set({
                user,
                token,
                refreshToken,
                isAuthenticated: true,
            });

            // Start token refresh interval
            get().startTokenRefreshInterval();
        } catch (error) {
            console.error('Failed to set auth data:', error);
            throw error;
        }
    },

    /**
     * Clear authentication data
     * Removes from Tauri backend and local state
     * Stops token refresh interval
     * @param preservePreferences - If true, keeps saved credentials; if false, clears them
     */
    clearAuth: async (preservePreferences?: boolean) => {
        try {
            // Stop token refresh interval
            get().stopTokenRefreshInterval();

            // Clear from Tauri backend
            await invoke('clear_auth');

            // Clear preferences if not preserving them
            if (!preservePreferences) {
                await invoke('clear_auth_preferences');
            }

            // Sign out from Supabase
            await supabase.auth.signOut();

            // Clear local state
            set({
                user: null,
                token: null,
                refreshToken: null,
                isAuthenticated: false,
            });
        } catch (error) {
            console.error('Failed to clear auth data:', error);
            // Still clear local state even if backend fails
            get().stopTokenRefreshInterval();
            set({
                user: null,
                token: null,
                refreshToken: null,
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
     * Sets Supabase session to enable automatic token refresh
     * Respects "Sign in automatically" preference
     */
    restoreSession: async () => {
        set({ isLoading: true });

        try {
            // Check if user wants to auto-login
            const prefs = await invoke<AuthPreferences | null>('get_auth_preferences');
            if (prefs && !prefs.signInAutomatically) {
                console.log('Auto sign-in disabled, skipping session restoration');
                set({ isLoading: false });
                return;
            }

            // Get user, access token, and refresh token from Tauri backend
            const user = await invoke<AuthUser | null>('get_user');
            const token = await invoke<string | null>('get_token');
            const refreshToken = await invoke<string | null>('get_refresh_token');

            if (!user || !token || !refreshToken) {
                set({ isLoading: false });
                return;
            }

            // Set Supabase session to enable automatic token refresh
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
                access_token: token,
                refresh_token: refreshToken,
            });

            if (sessionError || !session) {
                console.error('Failed to set Supabase session:', sessionError);
                // Token is invalid, clear auth data
                await get().clearAuth();
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
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
            });

            // Start token refresh interval
            get().startTokenRefreshInterval();
        } catch (error) {
            console.error('Failed to restore session:', error);
            await get().clearAuth();
            set({ isLoading: false });
        }
    },

    /**
     * Refresh authentication token using Supabase Auth
     */
    refreshAccessToken: async (): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.refreshSession();

            if (error || !data.session) {
                console.error('Token refresh failed:', error);
                await get().clearAuth();
                return false;
            }

            // Update tokens in state and backend
            const newToken = data.session.access_token;
            const newRefreshToken = data.session.refresh_token;
            const currentUser = get().user;

            if (currentUser) {
                await invoke('set_auth', { user: currentUser, token: newToken, refreshToken: newRefreshToken });
                set({ token: newToken, refreshToken: newRefreshToken });
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

            // Listen for auth changes from other windows
            await listen<AuthUser>('auth-changed', (event) => {
                const currentToken = get().token;
                set({
                    user: event.payload,
                    isAuthenticated: true,
                    // Keep the existing token if we have one
                    token: currentToken,
                });
            });

            // Listen for auth cleared from other windows
            await listen('auth-cleared', () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            });

            // Set up Supabase auth state listener
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_OUT') {
                    await get().clearAuth();
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    // Update token when Supabase auto-refreshes
                    const currentUser = get().user;
                    if (currentUser) {
                        await invoke('set_auth', {
                            user: currentUser,
                            token: session.access_token,
                            refreshToken: session.refresh_token
                        });
                        set({ token: session.access_token, refreshToken: session.refresh_token });
                    }
                } else if (event === 'SIGNED_IN' && session) {
                    // Handle sign-in event if needed
                    const currentUser = get().user;
                    if (currentUser) {
                        await invoke('set_auth', {
                            user: currentUser,
                            token: session.access_token,
                            refreshToken: session.refresh_token
                        });
                        set({ token: session.access_token, refreshToken: session.refresh_token });
                    }
                }
            });

            set({ isInitialized: true });
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            set({ isLoading: false, isInitialized: true });
        }
    },

    /**
     * Start periodic token refresh check
     * Checks every 5 minutes and refreshes if token expires in less than 10 minutes
     */
    startTokenRefreshInterval: () => {
        const existingInterval = get().refreshInterval;
        if (existingInterval !== null) {
            window.clearInterval(existingInterval);
        }

        const interval = window.setInterval(async () => {
            const token = get().token;
            if (!token) {
                return;
            }

            try {
                // Check if token is still valid
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error || !session) {
                    console.log('No valid session, attempting refresh...');
                    await get().refreshAccessToken();
                    return;
                }

                // Check token expiration (refresh if less than 10 minutes remaining)
                const expiresAt = session.expires_at;
                if (expiresAt) {
                    const now = Math.floor(Date.now() / 1000);
                    const timeUntilExpiry = expiresAt - now;
                    const TEN_MINUTES = 10 * 60;

                    if (timeUntilExpiry < TEN_MINUTES) {
                        console.log('Token expiring soon, refreshing...');
                        await get().refreshAccessToken();
                    }
                }
            } catch (error) {
                console.error('Token refresh check failed:', error);
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        set({ refreshInterval: interval });
        console.log('Token refresh interval started');
    },

    /**
     * Stop periodic token refresh check
     */
    stopTokenRefreshInterval: () => {
        const interval = get().refreshInterval;
        if (interval !== null) {
            window.clearInterval(interval);
            set({ refreshInterval: null });
            console.log('Token refresh interval stopped');
        }
    },

    /**
     * Save authentication preferences with optional encrypted password
     */
    saveAuthPreferences: async (prefs: AuthPreferences, _email: string, password: string) => {
        try {
            await invoke('save_auth_preferences', {
                preferences: prefs,
                password: prefs.rememberPassword ? password : null,
            });
            set({ authPreferences: prefs });
        } catch (error) {
            console.error('Failed to save auth preferences:', error);
            throw error;
        }
    },

    /**
     * Load authentication preferences from backend
     */
    loadAuthPreferences: async () => {
        try {
            const prefs = await invoke<AuthPreferences | null>('get_auth_preferences');
            set({ authPreferences: prefs });
            return prefs;
        } catch (error) {
            console.error('Failed to load auth preferences:', error);
            return null;
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
