/**
 * Global application settings management using Zustand
 * Handles settings persistence using Rust backend
 * Loads settings on app startup and applies them across the application
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * Application settings interface
 * Based on Requirement 14: Application Settings and Preferences
 */
export interface AppSettings {
    notifications: {
        enabled: boolean;
        soundEnabled: boolean;
        soundVolume: number; // 0-100
        desktopAlerts: boolean;
    };
    startup: {
        autoLaunch: boolean;
        startMinimized: boolean;
    };
    files: {
        downloadLocation: string;
        autoAcceptFrom: string[]; // User IDs to auto-accept files from
    };
}

/**
 * Default settings values
 */
const DEFAULT_SETTINGS: AppSettings = {
    notifications: {
        enabled: true,
        soundEnabled: true,
        soundVolume: 80,
        desktopAlerts: true,
    },
    startup: {
        autoLaunch: false,
        startMinimized: false,
    },
    files: {
        downloadLocation: '', // Will be set to system default on first run
        autoAcceptFrom: [],
    },
};

interface SettingsState {
    settings: AppSettings;
    isLoaded: boolean;

    // Actions
    updateNotificationSettings: (settings: Partial<AppSettings['notifications']>) => Promise<void>;
    updateStartupSettings: (settings: Partial<AppSettings['startup']>) => Promise<void>;
    updateFileSettings: (settings: Partial<AppSettings['files']>) => Promise<void>;
    resetSettings: () => Promise<void>;
    loadSettings: () => Promise<void>;
    setLoaded: (loaded: boolean) => void;
}

/**
 * Global settings store with Rust backend persistence
 * Settings are automatically saved to disk via Rust backend on every change
 * Settings are loaded from disk on app startup
 */
export const useSettingsStore = create<SettingsState>((set) => ({
    settings: DEFAULT_SETTINGS,
    isLoaded: false,

    /**
     * Load settings from Rust backend
     */
    loadSettings: async () => {
        try {
            const settings = await invoke<AppSettings>('get_settings');
            set({ settings, isLoaded: true });

            // Listen for settings changes from other windows/processes
            await listen<any>('settings-changed', (event) => {
                set((state) => ({
                    settings: {
                        ...state.settings,
                        ...event.payload,
                    },
                }));
            });

            // Also listen for settings reset events
            await listen('settings-reset', (event) => {
                const resetSettings = event.payload as AppSettings;
                set({ settings: resetSettings });
            });
        } catch (error) {
            console.error('Failed to load settings:', error);
            set({ isLoaded: true }); // Mark as loaded even if it fails
        }
    },

    /**
     * Update notification settings
     * Merges with existing notification settings
     */
    updateNotificationSettings: async (notificationSettings) => {
        try {
            set((state) => ({
                settings: {
                    ...state.settings,
                    notifications: {
                        ...state.settings.notifications,
                        ...notificationSettings,
                    },
                },
            }));

            const state = useSettingsStore.getState();
            await invoke('update_notification_settings', {
                notifications: state.settings.notifications,
            });
        } catch (error) {
            console.error('Failed to update notification settings:', error);
        }
    },

    /**
     * Update startup settings
     * Merges with existing startup settings
     */
    updateStartupSettings: async (startupSettings) => {
        try {
            set((state) => ({
                settings: {
                    ...state.settings,
                    startup: {
                        ...state.settings.startup,
                        ...startupSettings,
                    },
                },
            }));

            const state = useSettingsStore.getState();
            await invoke('update_startup_settings', {
                startup: state.settings.startup,
            });
        } catch (error) {
            console.error('Failed to update startup settings:', error);
        }
    },

    /**
     * Update file settings
     * Merges with existing file settings
     */
    updateFileSettings: async (fileSettings) => {
        try {
            set((state) => ({
                settings: {
                    ...state.settings,
                    files: {
                        ...state.settings.files,
                        ...fileSettings,
                    },
                },
            }));

            const state = useSettingsStore.getState();
            await invoke('update_file_settings', {
                files: state.settings.files,
            });
        } catch (error) {
            console.error('Failed to update file settings:', error);
        }
    },

    /**
     * Reset all settings to defaults
     */
    resetSettings: async () => {
        try {
            set({ settings: DEFAULT_SETTINGS });
            await invoke('reset_settings');
        } catch (error) {
            console.error('Failed to reset settings:', error);
        }
    },

    /**
     * Mark settings as loaded
     */
    setLoaded: (loaded) => {
        set({ isLoaded: loaded });
    },
}));

/**
 * Hook to get all settings
 */
export function useSettings(): AppSettings {
    return useSettingsStore((state) => state.settings);
}

/**
 * Hook to get notification settings
 */
export function useNotificationSettings() {
    return useSettingsStore((state) => state.settings.notifications);
}

/**
 * Hook to get startup settings
 */
export function useStartupSettings() {
    return useSettingsStore((state) => state.settings.startup);
}

/**
 * Hook to get file settings
 */
export function useFileSettings() {
    return useSettingsStore((state) => state.settings.files);
}

/**
 * Hook to check if settings are loaded
 */
export function useSettingsLoaded(): boolean {
    return useSettingsStore((state) => state.isLoaded);
}

/**
 * Hook to get settings update functions
 */
export function useSettingsActions() {
    return {
        updateNotificationSettings: useSettingsStore((state) => state.updateNotificationSettings),
        updateStartupSettings: useSettingsStore((state) => state.updateStartupSettings),
        updateFileSettings: useSettingsStore((state) => state.updateFileSettings),
        resetSettings: useSettingsStore((state) => state.resetSettings),
    };
}
