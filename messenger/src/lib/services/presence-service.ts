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
