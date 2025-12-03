/**
 * Global authentication state management using Zustand
 * Handles auth state derived from Supabase
 * Token and session persistence is handled entirely by Supabase with Tauri Store backend
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AuthPreferences } from '../types/auth-preferences';
import { supabase } from '../supabase';
import { Subscription } from '@supabase/supabase-js';

interface AuthState {
    authPreferences: AuthPreferences | null;
    saveAuthPreferences: (prefs: AuthPreferences, email: string, password: string) => Promise<void>;
    loadAuthPreferences: () => Promise<AuthPreferences | null>;
    initialize: () => Promise<Subscription | undefined>
    isAuthInitialized: boolean
    isAuthLoading: boolean
    isAuthenticated: boolean
}

/**
 * Global authentication store
 * State is derived from Supabase auth state
 * Session and token persistence is handled by Supabase with Tauri Store backend
 */
export const useAuthStore = create<AuthState>((set, get) => ({
    authPreferences: null,
    isAuthInitialized: false,
    isAuthLoading: true,
    isAuthenticated: false,

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

    initialize: async () => {
        if (get().isAuthInitialized) {
            return undefined
        }

        const { data: { user } } = await supabase.auth.getUser()
        // Set up Supabase auth state listener for real-time updates
        if (!user) {
            set({
                isAuthenticated: false,
                isAuthLoading: false
            })
        }


        const { data: {
            subscription
        } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                set({
                    isAuthenticated: false,
                    isAuthLoading: false
                })
            } else if ((event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session) {
                set({
                    isAuthenticated: true,
                    isAuthLoading: false
                })
            }
        });

        set({
            isAuthInitialized: true
        })

        return subscription
    }

}));