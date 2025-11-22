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

/**
 * Show a notification window positioned at the bottom right of the screen.
 * The window will auto-close after 5 seconds.
 * @param senderName - Name of the message sender
 * @param messagePreview - Preview of the message content
 * @param senderId - ID of the sender (used when clicking to open chat)
 */
export function showNotificationWindow(
    message: string,
    description: string,
    senderId?: string
): WebviewWindow {
    const label = `notification-${Date.now()}`;
    const encodedMessage = encodeURIComponent(message);
    const encodedDescription = encodeURIComponent(description);
    const path = `/notification.html?message=${encodedMessage}&description=${encodedDescription}&senderId=${senderId}`;

    return createWindow(label, path, {
        width: 300,
        height: 120,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focus: false,
    });
}
