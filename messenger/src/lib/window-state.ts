import { saveWindowState, restoreStateCurrent, StateFlags } from '@tauri-apps/plugin-window-state';

/**
 * Save the current window state to disk
 * Uses the official Tauri window-state plugin
 */
export async function saveState(): Promise<void> {
    try {
        await saveWindowState(StateFlags.ALL);
    } catch (error) {
        console.error('Failed to save window state:', error);
    }
}

/**
 * Restore the window state from disk
 * Uses the official Tauri window-state plugin
 *
 * Note: The plugin automatically restores window state on startup.
 * This function is provided for manual restoration if needed.
 */
export async function restoreState(): Promise<void> {
    try {
        await restoreStateCurrent(StateFlags.ALL);
    } catch (error) {
        console.error('Failed to restore window state:', error);
    }
}
