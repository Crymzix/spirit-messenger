import { getCurrentWindow, LogicalSize, LogicalPosition } from '@tauri-apps/api/window';

interface WindowState {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
}

const WINDOW_STATE_KEY = 'msn-messenger-window-state';

/**
 * Save the current window state to localStorage
 */
export async function saveWindowState(): Promise<void> {
    try {
        const appWindow = getCurrentWindow();

        const [size, position, isMaximized] = await Promise.all([
            appWindow.outerSize(),
            appWindow.outerPosition(),
            appWindow.isMaximized(),
        ]);

        const state: WindowState = {
            width: size.width,
            height: size.height,
            x: position.x,
            y: position.y,
            isMaximized,
        };

        localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save window state:', error);
    }
}

/**
 * Restore the window state from localStorage
 */
export async function restoreWindowState(): Promise<void> {
    try {
        const savedState = localStorage.getItem(WINDOW_STATE_KEY);

        if (!savedState) {
            return;
        }

        const state: WindowState = JSON.parse(savedState);
        const appWindow = getCurrentWindow();

        // Restore size and position
        await appWindow.setSize(new LogicalSize(state.width, state.height));
        await appWindow.setPosition(new LogicalPosition(state.x, state.y));

        // Restore maximized state
        if (state.isMaximized) {
            await appWindow.maximize();
        }
    } catch (error) {
        console.error('Failed to restore window state:', error);
    }
}

/**
 * Initialize window state persistence
 * Sets up event listeners to save state on window changes
 */
export function initializeWindowStatePersistence(): () => void {
    const appWindow = getCurrentWindow();

    // Save state when window is resized or moved
    const unlistenResize = appWindow.onResized(() => {
        saveWindowState();
    });

    const unlistenMove = appWindow.onMoved(() => {
        saveWindowState();
    });

    // Save state before window closes
    window.addEventListener('beforeunload', saveWindowState);

    // Return cleanup function
    return () => {
        unlistenResize.then(fn => fn());
        unlistenMove.then(fn => fn());
        window.removeEventListener('beforeunload', saveWindowState);
    };
}
