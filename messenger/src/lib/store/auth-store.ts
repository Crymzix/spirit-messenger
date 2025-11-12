/**
 * Global authentication state management using Zustand
 * Handles auth state, session restoration, and token refresh
 */

import { create } from 'zustand';
import { supabase } from '../supabase';
import type { AuthUser } from '../services/auth-service';

const TOKEN_STORAGE_KEY = 'msn_auth_token';
const USER_STORAGE_KEY = 'msn_user_data';

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    setAuth: (user: AuthUser, token: string) => void;
    clearAuth: () => void;
    updateUser: (user: Partial<AuthUser>) => void;
    restoreSession: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
    initialize: () => Promise<void>;
}

/**
 * Global authentication store
 */
export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,

    /**
     * Set authentication data
     */
    setAuth: (user: AuthUser, token: string) => {
        // Store in localStorage
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

        // Update state
        set({
            user,
            token,
            isAuthenticated: true,
        });
    },

    /**
     * Clear authentication data
     */
    clearAuth: () => {
        // Clear localStorage
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);

        // Clear state
        set({
            user: null,
            token: null,
            isAuthenticated: false,
        });
    },

    /**
     * Update user data
     */
    updateUser: (userData: Partial<AuthUser>) => {
        const currentUser = get().user;
        if (currentUser) {
            const updatedUser = { ...currentUser, ...userData };

            // Update localStorage
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

            // Update state
            set({ user: updatedUser });
        }
    },

    /**
     * Restore session from localStorage
     */
    restoreSession: async () => {
        set({ isLoading: true });

        try {
            const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
            const storedUserData = localStorage.getItem(USER_STORAGE_KEY);

            if (!storedToken || !storedUserData) {
                set({ isLoading: false });
                return;
            }

            // Parse stored user data
            const user = JSON.parse(storedUserData) as AuthUser;

            // Verify token with Supabase
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(storedToken);

            if (error || !supabaseUser) {
                // Token is invalid, clear auth data
                get().clearAuth();
                set({ isLoading: false });
                return;
            }

            // Token is valid, restore session
            set({
                user,
                token: storedToken,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to restore session:', error);
            get().clearAuth();
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
                get().clearAuth();
                return false;
            }

            // Update token in state and storage
            const newToken = data.session.access_token;
            const currentUser = get().user;

            if (currentUser) {
                localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
                set({ token: newToken });
            }

            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            get().clearAuth();
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
            // Restore session from localStorage
            await get().restoreSession();

            // Set up Supabase auth state listener
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);

                if (event === 'SIGNED_OUT') {
                    get().clearAuth();
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    // Update token when Supabase auto-refreshes
                    const currentUser = get().user;
                    if (currentUser) {
                        localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
                        set({ token: session.access_token });
                    }
                } else if (event === 'SIGNED_IN' && session) {
                    // Handle sign-in event if needed
                    const currentUser = get().user;
                    if (currentUser) {
                        localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
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
