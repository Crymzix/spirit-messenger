/**
 * Call Realtime Service
 * Manages Supabase Realtime subscriptions for WebRTC call events and signaling
 * 
 * Handles two types of subscriptions:
 * 1. Call Events: call_ringing, call_answered, call_declined, call_ended
 * 2. Signaling Events: sdp_offer, sdp_answer, ice_candidate
 * 
 * Requirements: 2.1, 2.3, 6.3
 */

import { useCallStore } from '../store/call-store';
import type { Call } from '@/types';
import { Event } from '@tauri-apps/api/event';
import { CallAnsweredPayload, CallDeclinedPayload, CallEndedPayload, CallRingingPayload } from '../hooks/call-hooks';

/**
 * Call event types sent via Supabase Realtime
 */
export type CallEventType =
    | 'call_ringing'
    | 'call_answered'
    | 'call_declined'
    | 'call_ended'
    | 'call_failed';

/**
 * Signaling event types for WebRTC
 */
export type SignalingEventType = 'signal';

/**
 * Call event payload structure
 */
export interface CallEventPayload {
    type: CallEventType;
    call: Call;
    userId: string; // The user who triggered the event
}

/**
 * Signaling event payload structure
 */
export interface SignalingEventPayload {
    type: SignalingEventType;
    callId: string;
    conversationId: string;
    fromUserId: string;
    targetUserId?: string;
    data: any; // SDP description or ICE candidate
}

export interface SignalingEventHandlers {
    onSignal?: (signalData: any, fromUserId: string) => void;
}

/**
 * Call Realtime Service Class
 * Manages Supabase Realtime subscriptions for call events and signaling
 */
export class CallRealtimeService {

    handleCallEvent(event: Event<any>, userId: string) {
        const eventPayload = event.payload
        switch (eventPayload.event) {
            case 'call_ringing': {
                const payload = eventPayload.payload as CallRingingPayload

                if (userId === payload.initiatorId) {
                    console.log('Ignoring call event from self');
                    return;
                }

                this.handleCallRinging(payload.initiatorId);
                break
            }

            case 'call_answered': {
                const payload = eventPayload.payload as CallAnsweredPayload

                if (userId === payload.answeredBy) {
                    console.log('Ignoring call event from self');
                    return;
                }

                this.handleCallAnswered()
                break
            }

            case 'call_declined': {
                const payload = eventPayload.payload as CallDeclinedPayload

                if (userId === payload.declinedBy) {
                    console.log('Ignoring call event from self');
                    return;
                }

                this.handleCallDeclined();
                break
            }

            case 'call_ended': {
                const payload = eventPayload.payload as CallEndedPayload

                if (userId === payload.endedBy) {
                    console.log('Ignoring call event from self');
                    return;
                }

                this.handleCallEnded();
                break
            }

            case 'call_failed': {
                this.handleCallFailed();
                break
            }
        }
    }

    /**
     * Handle call_ringing event
     * Triggered when someone initiates a call to this user
     *
     * @private
     */
    private handleCallRinging(callerId: string): void {
        console.log('Handling call_ringing event', { callerId });

        // Update call store
        const callStore = useCallStore.getState();

        callStore.setCallState('ringing');
    }

    /**
     * Handle call_answered event
     * Triggered when the other party answers the call
     *
     * @private
     */
    private handleCallAnswered(): void {
        console.log('Handling call_answered event');

        // Update call store
        const callStore = useCallStore.getState();

        callStore.setCallState('connecting');
    }

    /**
     * Handle call_declined event
     * Triggered when the other party declines the call
     * 
     * @private
     */
    private handleCallDeclined(): void {
        console.log('Handling call_declined event');

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');

        // Clean up after a short delay to allow UI to show declined state
        setTimeout(() => {
            callStore.reset();
        }, 2000);
    }

    /**
     * Handle call_ended event
     * Triggered when the other party ends the call
     * 
     * @private
     */
    private handleCallEnded(): void {
        console.log('Handling call_ended event');

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');

        // Clean up call state
        setTimeout(() => {
            callStore.reset();
        }, 1000);
    }

    /**
     * Handle call_failed event
     * Triggered when a call fails due to an error
     * 
     * @private
     */
    private handleCallFailed(): void {
        console.log('Handling call_failed event');

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');

        // Clean up call state
        setTimeout(() => {
            callStore.reset();
        }, 1000);
    }

}

/**
 * Singleton instance of Call Realtime Service
 * Use this instance throughout the application
 */
export const callRealtimeService = new CallRealtimeService();
