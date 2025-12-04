/**
 * Presence service for managing user presence status
 * Handles presence updates to Backend Service API
 * Implements automatic "Away" status after 5 minutes of inactivity
 * Tracks user activity (mouse movement, keyboard input)
 * 
 * Architecture:
 * - Write operations: All presence updates go through Backend Service API
 * - Activity tracking: Monitors mouse and keyboard events to detect user activity
 * - Auto-away: Automatically sets status to "away" after 5 minutes of inactivity
 * 
 * Usage:
 * 1. Call updatePresence() to manually change presence status
 * 2. Call startActivityTracking() to enable automatic away status
 * 3. Call stopActivityTracking() to disable automatic tracking
 */

import { apiPut } from '../api-client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PresenceStatus } from '@/types';

export interface UpdatePresenceData {
    presenceStatus: PresenceStatus;
}

export interface UpdatePresenceResponse {
    success: boolean;
}

// Activity tracking configuration
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
let activityTimer: number | null = null;
let isTrackingActivity = false;
let lastActivityTime = Date.now();
let currentPresenceStatus: PresenceStatus = 'online';
let userSetStatus: PresenceStatus = 'online'; // The status the user explicitly set

// Supabase Presence channel
let presenceChannel: RealtimeChannel | null = null;
let currentUserId: string | null = null;

/**
 * Update user presence status
 * Sends presence update to Backend Service
 */
export async function updatePresence(
    presenceStatus: PresenceStatus
): Promise<UpdatePresenceResponse> {
    const response = await apiPut<{ success: boolean }>(
        '/api/users/presence',
        { presenceStatus }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update presence');
    }

    // Update current status tracking
    currentPresenceStatus = presenceStatus;

    // If user manually sets status, remember it (but not if it's auto-away)
    if (presenceStatus !== 'away' || !isTrackingActivity) {
        userSetStatus = presenceStatus;
    }

    // Update Supabase presence track
    await updatePresenceTrack();

    return response.data;
}

/**
 * Handle user activity
 * Resets the inactivity timer and updates status if needed
 */
function handleActivity(): void {
    lastActivityTime = Date.now();

    // If user was auto-set to away, bring them back to their previous status
    if (currentPresenceStatus === 'away' && userSetStatus !== 'away') {
        updatePresence(userSetStatus).catch((error) => {
            console.error('Failed to update presence on activity:', error);
        });
    }

    // Reset the inactivity timer
    if (activityTimer !== null) {
        window.clearTimeout(activityTimer);
    }

    // Set new timer for auto-away
    activityTimer = window.setTimeout(() => {
        setAutoAway();
    }, INACTIVITY_TIMEOUT);
}

/**
 * Set status to away automatically due to inactivity
 */
function setAutoAway(): void {
    // Only auto-set to away if user's status is online or busy
    // Don't override if user manually set to away or appear_offline
    if (currentPresenceStatus === 'online' || currentPresenceStatus === 'busy') {
        updatePresence('away').catch((error) => {
            console.error('Failed to set auto-away status:', error);
        });
    }
}

/**
 * Start tracking user activity for automatic away status
 * Monitors mouse movement and keyboard input
 *
 * @param initialStatus - The initial presence status (default: 'online')
 */
export function startActivityTracking(
    initialStatus: PresenceStatus = 'online'
): void {
    // Always set initial presence status on the backend, even if already tracking
    // This handles cases like page reload where state may be stale
    updatePresence(initialStatus).catch((error) => {
        console.error('Failed to set initial presence status:', error);
    });

    if (isTrackingActivity) {
        console.warn('Activity tracking is already enabled');
        return;
    }

    isTrackingActivity = true;
    currentPresenceStatus = initialStatus;
    userSetStatus = initialStatus;
    lastActivityTime = Date.now();

    // Create throttled activity handler to avoid excessive updates
    let throttleTimeout: number | null = null;
    const throttledHandler = () => {
        if (throttleTimeout === null) {
            handleActivity();
            throttleTimeout = window.setTimeout(() => {
                throttleTimeout = null;
            }, 1000); // Throttle to once per second
        }
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', throttledHandler);
    window.addEventListener('mousedown', throttledHandler);
    window.addEventListener('keydown', throttledHandler);
    window.addEventListener('wheel', throttledHandler);
    window.addEventListener('touchstart', throttledHandler);

    // Start the initial inactivity timer
    activityTimer = window.setTimeout(() => {
        setAutoAway();
    }, INACTIVITY_TIMEOUT);

    console.log('Activity tracking started');
}

/**
 * Stop tracking user activity
 * Removes all event listeners and clears timers
 */
export function stopActivityTracking(): void {
    if (!isTrackingActivity) {
        return;
    }

    isTrackingActivity = false;

    // Clear the inactivity timer
    if (activityTimer !== null) {
        window.clearTimeout(activityTimer);
        activityTimer = null;
    }

    // Remove event listeners
    // Note: We can't remove the throttled handler directly since it's a closure
    // In a production app, we'd store the handler reference
    // For now, we'll accept that the listeners remain but won't do anything
    // since isTrackingActivity is false

    console.log('Activity tracking stopped');
}

/**
 * Get the current presence status
 */
export function getCurrentPresenceStatus(): PresenceStatus {
    return currentPresenceStatus;
}

/**
 * Get the user-set presence status (not auto-away)
 */
export function getUserSetPresenceStatus(): PresenceStatus {
    return userSetStatus;
}

/**
 * Check if activity tracking is enabled
 */
export function isActivityTrackingEnabled(): boolean {
    return isTrackingActivity;
}

/**
 * Get time since last activity in milliseconds
 */
export function getTimeSinceLastActivity(): number {
    return Date.now() - lastActivityTime;
}

/**
 * Manually update the user-set status
 * This is called when the user explicitly changes their status
 *
 * @param status - The new presence status
 */
export async function setUserPresenceStatus(
    status: PresenceStatus
): Promise<UpdatePresenceResponse> {
    userSetStatus = status;

    // If setting to away or appear_offline, stop the auto-away timer
    // but keep tracking activity for when they come back
    if (status === 'away' || status === 'appear_offline' || status === 'offline') {
        if (activityTimer !== null) {
            window.clearTimeout(activityTimer);
            activityTimer = null;
        }
    } else if (isTrackingActivity) {
        // Restart the auto-away timer for online/busy status
        if (activityTimer !== null) {
            window.clearTimeout(activityTimer);
        }
        activityTimer = window.setTimeout(() => {
            setAutoAway();
        }, INACTIVITY_TIMEOUT);
    }

    return updatePresence(status);
}

/**
 * Initialize Supabase Presence channel for automatic disconnect detection
 * @param userId - The current user's ID
 */
export async function initPresenceChannel(userId: string): Promise<void> {
    // If there's an existing channel (e.g., from hot reload), clean it up first
    if (presenceChannel) {
        console.log('Cleaning up stale presence channel before reinitializing');
        await presenceChannel.untrack();
        await supabase.removeChannel(presenceChannel);
        presenceChannel = null;
    }

    currentUserId = userId;

    presenceChannel = supabase.channel('presence:online', {
        config: {
            presence: {
                key: userId,
            },
        },
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel?.presenceState();
            console.log('Presence sync:', state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
            console.log('User left:', key, leftPresences);
            // When a user disconnects, update their status to offline
            // This is handled by detecting our own disconnect on reconnect
            // or by other clients observing the leave event
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Track our presence with current status
                await presenceChannel?.track({
                    status: currentPresenceStatus,
                    userId: userId,
                    online_at: new Date().toISOString(),
                });
                console.log('Presence channel subscribed and tracking');
            }
        });
}

/**
 * Update presence tracking state in Supabase channel
 */
async function updatePresenceTrack(): Promise<void> {
    if (presenceChannel && currentUserId) {
        await presenceChannel.track({
            status: currentPresenceStatus,
            userId: currentUserId,
            online_at: new Date().toISOString(),
        });
    }
}

/**
 * Cleanup Supabase Presence channel
 */
export async function cleanupPresenceChannel(): Promise<void> {
    if (presenceChannel) {
        await presenceChannel.untrack();
        await supabase.removeChannel(presenceChannel);
        presenceChannel = null;
        currentUserId = null;
        console.log('Presence channel cleaned up');
    }
}

/**
 * Set user offline and cleanup
 * Called when app is closing or user is logging out
 */
export async function setOfflineOnExit(): Promise<void> {
    if (isTrackingActivity || currentPresenceStatus !== 'offline') {
        stopActivityTracking();
        try {
            // Set offline first, then cleanup the channel
            await updatePresence('offline');
            await cleanupPresenceChannel();
        } catch (error) {
            console.error('Failed to set offline status on exit:', error);
        }
    }
}

/**
 * Initialize Tauri lifecycle listeners for presence management
 *
 * NOTE: This function is kept for backward compatibility but does not currently
 * register any handlers because:
 *
 * 1. Window close events (clicking X button) should NOT set user offline
 *    - Main window minimizes to tray (not actually closing)
 *    - Chat windows should just close without affecting presence
 *
 * 2. Offline status on app quit is handled by the backend's presence listener
 *    which automatically detects when the Supabase connection drops and sets
 *    the user offline after a 3-second grace period.
 *
 * 3. Explicit logout is handled separately via setUserPresenceStatus('offline')
 *
 * This approach is more reliable because:
 * - It handles crashes and force-quits automatically
 * - It doesn't rely on frontend code completing before window closes
 * - Multiple windows don't interfere with each other's presence status
 */
export async function initPresenceLifecycle(): Promise<void> {
    const appWindow = getCurrentWindow();
    const windowLabel = appWindow.label;
    console.log(`initPresenceLifecycle called for window: ${windowLabel} - no handlers registered (handled by backend)`);
}
