import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

/**
 * Sound types available in the application
 */
export type SoundType = 'message' | 'contact_online' | 'contact_offline' | 'nudge' | 'video_call';

/**
 * Sound settings interface
 */
export interface SoundSettings {
    enabled: boolean;
    volume: number; // 0.0 to 1.0
}

/**
 * Service for playing sounds in the application
 */
export class SoundService {
    private settings: SoundSettings = {
        enabled: true,
        volume: 0.7,
    };
    private audioElements: Map<string, HTMLAudioElement> = new Map();
    private initialized = false;

    constructor() {
        this.loadSettings();
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
     * Load sound settings from localStorage
     */
    private loadSettings(): void {
        try {
            const stored = localStorage.getItem('sound-settings');
            if (stored) {
                this.settings = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load sound settings:', error);
        }
    }

    /**
     * Save sound settings to localStorage
     */
    private saveSettings(): void {
        try {
            localStorage.setItem('sound-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save sound settings:', error);
        }
    }

    /**
     * Play a sound file directly using the Audio API
     * @param soundFile - Path to the sound file relative to public directory
     * @param volume - Volume level (0.0 to 1.0)
     */
    private playAudioFile(soundFile: string, volume: number): void {
        if (!this.settings.enabled) return;

        try {
            // Get or create audio element for this sound
            let audio = this.audioElements.get(soundFile);

            if (!audio) {
                audio = new Audio(`/${soundFile}`);
                this.audioElements.set(soundFile, audio);
            }

            // Reset to beginning if already playing
            audio.currentTime = 0;
            audio.volume = volume * this.settings.volume;

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
        if (!this.settings.enabled) return;

        try {
            await invoke('play_sound', {
                soundType,
                volume: this.settings.volume,
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
     * @param enabled - Whether sounds should be enabled
     */
    setEnabled(enabled: boolean): void {
        this.settings.enabled = enabled;
        this.saveSettings();
    }

    /**
     * Check if sounds are enabled
     */
    isEnabled(): boolean {
        return this.settings.enabled;
    }

    /**
     * Set the volume level
     * @param volume - Volume level (0.0 to 1.0)
     */
    setVolume(volume: number): void {
        this.settings.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    /**
     * Get the current volume level
     */
    getVolume(): number {
        return this.settings.volume;
    }

    /**
     * Get the current sound settings
     */
    getSettings(): SoundSettings {
        return { ...this.settings };
    }

    /**
     * Update sound settings
     * @param settings - New sound settings
     */
    updateSettings(settings: Partial<SoundSettings>): void {
        this.settings = {
            ...this.settings,
            ...settings,
        };
        this.saveSettings();
    }

    /**
     * Preview a sound (useful for settings UI)
     * @param soundType - Type of sound to preview
     */
    async previewSound(soundType: SoundType): Promise<void> {
        // Temporarily enable sounds for preview
        const wasEnabled = this.settings.enabled;
        this.settings.enabled = true;

        try {
            await this.play(soundType);
        } finally {
            this.settings.enabled = wasEnabled;
        }
    }
}

// Export singleton instance
export const soundService = new SoundService();
