import { getSupabase } from './supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * RealtimePublisher
 * Centralized service for publishing call-related events via Supabase Realtime
 * 
 * This class handles all WebRTC signaling and call state change notifications
 * by broadcasting events to specific user channels.
 */

export interface CallRingingPayload {
    callId: string;
    conversationId: string;
    initiatorId: string;
    callType: 'voice' | 'video';
}

export interface CallAnsweredPayload {
    callId: string;
    conversationId: string;
    answeredBy: string;
}

export interface CallDeclinedPayload {
    callId: string;
    conversationId: string;
    declinedBy: string;
}

export interface CallEndedPayload {
    callId: string;
    conversationId: string;
    endedBy: string;
    durationSeconds: number;
}

export interface CallMissedPayload {
    callId: string;
    conversationId: string;
}

export interface CallFailedPayload {
    callId: string;
    conversationId: string;
    errorReason: string;
}

export interface SignalPayload {
    callId: string;
    conversationId: string;
    fromUserId: string;
    targetUserId?: string;
    data: any;
}

export class RealtimePublisher {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = getSupabase();
    }

    /**
     * Publish call_ringing event to recipient
     * Notifies the recipient that an incoming call is ringing
     * 
     * @param recipientUserId - The user ID of the call recipient
     * @param payload - Call ringing event data
     * @throws Error if publishing fails
     */
    async publishCallRinging(
        recipientUserId: string,
        payload: CallRingingPayload
    ): Promise<void> {
        try {
            const channel = this.supabase.channel(`call-events:${recipientUserId}`);

            await channel.send({
                type: 'broadcast',
                event: 'call_ringing',
                payload,
            });

            // Unsubscribe after sending to clean up
            await channel.unsubscribe();
        } catch (error) {
            console.error('Error publishing call_ringing event:', error);
            throw new Error(`Failed to publish call_ringing event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Publish call_answered event to both participants
     * Notifies both users that the call has been answered and is becoming active
     * 
     * @param participantUserIds - Array of user IDs for both call participants
     * @param payload - Call answered event data
     * @throws Error if publishing fails
     */
    async publishCallAnswered(
        participantUserIds: string[],
        payload: CallAnsweredPayload
    ): Promise<void> {
        try {
            const publishPromises = participantUserIds.map(async (userId) => {
                const channel = this.supabase.channel(`call-events:${userId}`);

                await channel.send({
                    type: 'broadcast',
                    event: 'call_answered',
                    payload,
                });

                // Unsubscribe after sending to clean up
                await channel.unsubscribe();
            });

            await Promise.all(publishPromises);
        } catch (error) {
            console.error('Error publishing call_answered event:', error);
            throw new Error(`Failed to publish call_answered event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Publish call_declined event to caller
     * Notifies the caller that their call has been declined
     * 
     * @param participantUserIds - Array of user IDs for both call participants
     * @param payload - Call declined event data
     * @throws Error if publishing fails
     */
    async publishCallDeclined(
        participantUserIds: string[],
        payload: CallDeclinedPayload
    ): Promise<void> {
        try {
            const publishPromises = participantUserIds.map(async (userId) => {
                const channel = this.supabase.channel(`call-events:${userId}`);

                await channel.send({
                    type: 'broadcast',
                    event: 'call_declined',
                    payload,
                });

                // Unsubscribe after sending to clean up
                await channel.unsubscribe();
            });

            await Promise.all(publishPromises);
        } catch (error) {
            console.error('Error publishing call_declined event:', error);
            throw new Error(`Failed to publish call_declined event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Publish call_ended event to both participants
     * Notifies both users that the call has ended
     * 
     * @param participantUserIds - Array of user IDs for both call participants
     * @param payload - Call ended event data
     * @throws Error if publishing fails
     */
    async publishCallEnded(
        participantUserIds: string[],
        payload: CallEndedPayload
    ): Promise<void> {
        try {
            const publishPromises = participantUserIds.map(async (userId) => {
                const channel = this.supabase.channel(`call-events:${userId}`);

                await channel.send({
                    type: 'broadcast',
                    event: 'call_ended',
                    payload,
                });

                // Unsubscribe after sending to clean up
                await channel.unsubscribe();
            });

            await Promise.all(publishPromises);
        } catch (error) {
            console.error('Error publishing call_ended event:', error);
            throw new Error(`Failed to publish call_ended event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Publish call_missed event to both participants
     * Notifies both users that the call was not answered and timed out
     * 
     * @param participantUserIds - Array of user IDs for both call participants
     * @param payload - Call missed event data
     * @throws Error if publishing fails
     */
    async publishCallMissed(
        participantUserIds: string[],
        payload: CallMissedPayload
    ): Promise<void> {
        try {
            const publishPromises = participantUserIds.map(async (userId) => {
                const channel = this.supabase.channel(`call-events:${userId}`);

                await channel.send({
                    type: 'broadcast',
                    event: 'call_missed',
                    payload,
                });

                // Unsubscribe after sending to clean up
                await channel.unsubscribe();
            });

            await Promise.all(publishPromises);
        } catch (error) {
            console.error('Error publishing call_missed event:', error);
            throw new Error(`Failed to publish call_missed event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Publish call_failed event to both participants
     * Notifies both users that the call has failed due to an error
     * 
     * @param participantUserIds - Array of user IDs for both call participants
     * @param payload - Call failed event data
     * @throws Error if publishing fails
     */
    async publishCallFailed(
        participantUserIds: string[],
        payload: CallFailedPayload
    ): Promise<void> {
        try {
            const publishPromises = participantUserIds.map(async (userId) => {
                const channel = this.supabase.channel(`call-events:${userId}`);

                await channel.send({
                    type: 'broadcast',
                    event: 'call_failed',
                    payload,
                });

                // Unsubscribe after sending to clean up
                await channel.unsubscribe();
            });

            await Promise.all(publishPromises);
        } catch (error) {
            console.error('Error publishing call_failed event:', error);
            throw new Error(`Failed to publish call_failed event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Publish signaling data (bundled signal events with SDP and ICE candidates)
     * Forwards WebRTC signaling data from one peer to another via the call-signaling channel
     *
     * @param payload - Signal data payload (must include callId)
     * @throws Error if publishing fails
     */
    async publishSignal(
        payload: SignalPayload
    ): Promise<void> {
        try {
            // Use call-signaling channel keyed by callId to isolate signaling per call
            const channel = this.supabase.channel(`call-signaling:${payload.callId}`);
            console.log('Publishing WebRTC signal for call:', payload.callId)
            await channel.send({
                type: 'broadcast',
                event: 'signal',
                payload,
            });

            // Unsubscribe after sending to clean up
            await channel.unsubscribe();
        } catch (error) {
            console.error('Error publishing signal event:', error);
            throw new Error(`Failed to publish signal event: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Export singleton instance
export const realtimePublisher = new RealtimePublisher();
