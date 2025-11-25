import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSettingsStore } from '../store/settings-store';

/**
 * Sound types available in the application
 */
export type SoundType = 'message' | 'contact_online' | 'contact_offline' | 'nudge' | 'video_call';

/**
 * Service for playing sounds in the application
 * Uses the global settings store for sound preferences
 */
export class SoundService {
    private audioElements: Map<string, HTMLAudioElement> = new Map();
    private initialized = false;

    constructor() {
        this.setupEventListener();
    }

    /**
     * Initialize the sound service and set up event listeners
     */
    private async setupEventListener(): Promise<void> {
        if (this.initialized) return;

        try {
            // Listen for play-sound events from Rust backend
            await listen<{ soundFile: string; volume: number }>('play-sound', (event) => {
                const { soundFile, volume } = event.payload;
                this.playAudioFile(soundFile, volume);
            });

            this.initialized = true;
        } catch (error) {
            console.error('Failed to set up sound event listener:', error);
        }
    }

    /**
     * Get current sound settings from the global settings store
     */
    private getSettings() {
        const state = useSettingsStore.getState();
        return state.settings.notifications;
    }

    /**
     * Play a sound file directly using the Audio API
     * @param soundFile - Path to the sound file relative to public directory
     * @param volume - Volume level (0.0 to 1.0)
     */
    private playAudioFile(soundFile: string, volume: number): void {
        const settings = this.getSettings();
        if (!settings.soundEnabled) return;

        try {
            // Get or create audio element for this sound
            let audio = this.audioElements.get(soundFile);

            if (!audio) {
                audio = new Audio(`/${soundFile}`);
                this.audioElements.set(soundFile, audio);
            }

            // Reset to beginning if already playing
            audio.currentTime = 0;
            // Convert volume from 0-100 to 0-1 scale
            audio.volume = volume * (settings.soundVolume / 100);

            // Play the sound
            audio.play().catch((error) => {
                console.error(`Failed to play sound ${soundFile}:`, error);
            });
        } catch (error) {
            console.error(`Error playing sound ${soundFile}:`, error);
        }
    }

    /**
     * Play a sound by type
     * @param soundType - Type of sound to play
     */
    async play(soundType: SoundType): Promise<void> {
        const settings = this.getSettings();
        if (!settings.soundEnabled) return;

        try {
            // Convert volume from 0-100 to 0-1 scale for Rust backend
            await invoke('play_sound', {
                soundType,
                volume: settings.soundVolume / 100,
            });
        } catch (error) {
            console.error(`Failed to play sound ${soundType}:`, error);
            throw error;
        }
    }

    /**
     * Play the new message sound
     */
    async playMessageSound(): Promise<void> {
        await this.play('message');
    }

    /**
     * Play the contact online sound
     */
    async playContactOnlineSound(): Promise<void> {
        await this.play('contact_online');
    }

    /**
     * Play the contact offline sound
     */
    async playContactOfflineSound(): Promise<void> {
        await this.play('contact_offline');
    }

    /**
     * Play the nudge sound
     */
    async playNudgeSound(): Promise<void> {
        await this.play('nudge');
    }

    /**
     * Play the video call sound
     */
    async playVideoCallSound(): Promise<void> {
        await this.play('video_call');
    }

    /**
     * Enable or disable sounds
     * Updates the global settings store
     * @param enabled - Whether sounds should be enabled
     */
    setEnabled(enabled: boolean): void {
        const state = useSettingsStore.getState();
        state.updateNotificationSettings({ soundEnabled: enabled });
    }

    /**
     * Check if sounds are enabled
     */
    isEnabled(): boolean {
        return this.getSettings().soundEnabled;
    }

    /**
     * Set the volume level
     * Updates the global settings store
     * @param volume - Volume level (0-100)
     */
    setVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(100, volume));
        const state = useSettingsStore.getState();
        state.updateNotificationSettings({ soundVolume: clampedVolume });
    }

    /**
     * Get the current volume level (0-100)
     */
    getVolume(): number {
        return this.getSettings().soundVolume;
    }

    /**
     * Preview a sound (useful for settings UI)
     * Always plays regardless of enabled setting
     * @param soundType - Type of sound to preview
     */
    async previewSound(soundType: SoundType): Promise<void> {
        const settings = this.getSettings();

        try {
            // Always play preview with current volume
            await invoke('play_sound', {
                soundType,
                volume: settings.soundVolume / 100,
            });
        } catch (error) {
            console.error(`Failed to preview sound ${soundType}:`, error);
        }
    }
}

// Export singleton instance
export const soundService = new SoundService();
