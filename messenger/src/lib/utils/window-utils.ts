import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { WindowOptions } from '@tauri-apps/api/window';

/**
 * Get the correct URL for opening a Tauri window.
 * In development mode (vite dev server), use the dev server URL.
 * In production/debug builds, use relative paths that work with Tauri's protocol.
 */
export function getWindowUrl(path: string): string {
    // Check if we're running in development mode by looking for the dev server
    const isDev = window.location.protocol === 'http:' &&
        window.location.hostname === 'localhost' &&
        window.location.port === '1420';

    if (isDev) {
        return `http://localhost:1420${path}`;
    }

    // In production/debug builds, use relative paths
    // Tauri will handle the protocol (tauri:// or http://tauri.localhost)
    return path;
}

/**
 * Create a new WebviewWindow with the correct URL for the current environment.
 * Handles the URL resolution automatically and sets up error logging.
 */
export function createWindow(
    label: string,
    path: string,
    options: WindowOptions
): WebviewWindow {
    const url = getWindowUrl(path);

    const window = new WebviewWindow(label, {
        ...options,
        url,
    });

    window.once('tauri://created', () => {
        console.log(`Window '${label}' created successfully`);
    });

    window.once('tauri://error', (e) => {
        console.error(`Error creating window '${label}':`, e);
    });

    return window;
}
