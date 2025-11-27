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

import { supabase } from '../supabase';
import { useCallStore } from '../store/call-store';
import { webrtcService } from './webrtc-service';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Call } from '@/types';

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
export type SignalingEventType =
    | 'sdp_offer'
    | 'sdp_answer'
    | 'ice_candidate';

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
    fromUserId: string;
    toUserId: string;
    data: any; // SDP description or ICE candidate
}

/**
 * Event handler callbacks
 */
export interface CallEventHandlers {
    onCallRinging?: (call: Call, callerId: string) => void;
    onCallAnswered?: (call: Call) => void;
    onCallDeclined?: (call: Call) => void;
    onCallEnded?: (call: Call) => void;
    onCallFailed?: (call: Call) => void;
}

export interface SignalingEventHandlers {
    onSdpOffer?: (offer: RTCSessionDescriptionInit, fromUserId: string) => void;
    onSdpAnswer?: (answer: RTCSessionDescriptionInit, fromUserId: string) => void;
    onIceCandidate?: (candidate: RTCIceCandidateInit, fromUserId: string) => void;
}

/**
 * Call Realtime Service Class
 * Manages Supabase Realtime subscriptions for call events and signaling
 */
export class CallRealtimeService {
    private callEventsChannel: RealtimeChannel | null = null;
    private signalingChannel: RealtimeChannel | null = null;
    private currentUserId: string | null = null;
    private callEventHandlers: CallEventHandlers = {};
    private signalingEventHandlers: SignalingEventHandlers = {};

    /**
     * Set the current user ID for filtering events
     * Must be called before subscribing to events
     */
    setCurrentUserId(userId: string): void {
        this.currentUserId = userId;
    }

    /**
     * Subscribe to call events (ringing, answered, declined, ended)
     * These events notify users about call state changes
     * 
     * @param handlers - Callback functions for each event type
     * @returns Promise that resolves when subscription is established
     */
    async subscribeToCallEvents(handlers: CallEventHandlers): Promise<void> {
        if (!this.currentUserId) {
            throw new Error('Current user ID must be set before subscribing to call events');
        }

        // Store handlers
        this.callEventHandlers = handlers;

        // Unsubscribe from existing channel if any
        if (this.callEventsChannel) {
            await this.unsubscribeFromCallEvents();
        }

        // Create a new channel for call events
        // Subscribe to broadcast messages on the 'call-events' channel
        this.callEventsChannel = supabase.channel(`call-events:${this.currentUserId}`);

        // Listen for call event broadcasts
        this.callEventsChannel.on(
            'broadcast',
            { event: 'call_event' },
            (payload: { payload: CallEventPayload }) => {
                this.handleCallEvent(payload.payload);
            }
        );

        // Subscribe to the channel
        await this.callEventsChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Subscribed to call events channel');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Error subscribing to call events channel');
            } else if (status === 'TIMED_OUT') {
                console.error('Timed out subscribing to call events channel');
            }
        });
    }

    /**
     * Subscribe to signaling events for an active call
     * These events exchange WebRTC signaling data (SDP and ICE candidates)
     * 
     * @param callId - The ID of the active call
     * @param handlers - Callback functions for signaling events
     * @returns Promise that resolves when subscription is established
     */
    async subscribeToSignaling(
        callId: string,
        handlers: SignalingEventHandlers
    ): Promise<void> {
        if (!this.currentUserId) {
            throw new Error('Current user ID must be set before subscribing to signaling');
        }

        // Store handlers
        this.signalingEventHandlers = handlers;

        // Unsubscribe from existing signaling channel if any
        if (this.signalingChannel) {
            await this.unsubscribeFromSignaling();
        }

        // Create a new channel for signaling events specific to this call
        // Use call ID in channel name to isolate signaling per call
        this.signalingChannel = supabase.channel(`call-signaling:${callId}`);

        // Listen for signaling broadcasts
        this.signalingChannel.on(
            'broadcast',
            { event: 'signaling' },
            (payload: { payload: SignalingEventPayload }) => {
                this.handleSignalingEvent(payload.payload);
            }
        );

        // Subscribe to the channel
        await this.signalingChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`Subscribed to signaling channel for call ${callId}`);
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Error subscribing to signaling channel');
            } else if (status === 'TIMED_OUT') {
                console.error('Timed out subscribing to signaling channel');
            }
        });
    }

    /**
     * Handle incoming call events
     * Routes events to appropriate handlers and updates call store
     * 
     * @private
     */
    private handleCallEvent(payload: CallEventPayload): void {
        const { type, call, userId } = payload;

        console.log(`Received call event: ${type}`, { call, userId });

        // Ignore events from self
        if (userId === this.currentUserId) {
            console.log('Ignoring call event from self');
            return;
        }

        // Route to appropriate handler
        switch (type) {
            case 'call_ringing':
                this.handleCallRinging(call, userId);
                break;

            case 'call_answered':
                this.handleCallAnswered(call);
                break;

            case 'call_declined':
                this.handleCallDeclined(call);
                break;

            case 'call_ended':
                this.handleCallEnded(call);
                break;

            case 'call_failed':
                this.handleCallFailed(call);
                break;

            default:
                console.warn(`Unknown call event type: ${type}`);
        }
    }

    /**
     * Handle call_ringing event
     * Triggered when someone initiates a call to this user
     * 
     * @private
     */
    private handleCallRinging(call: Call, callerId: string): void {
        console.log('Handling call_ringing event', { call, callerId });

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setActiveCall(call);
        callStore.setCallState('ringing');

        // Call custom handler if provided
        if (this.callEventHandlers.onCallRinging) {
            this.callEventHandlers.onCallRinging(call, callerId);
        }
    }

    /**
     * Handle call_answered event
     * Triggered when the other party answers the call
     * 
     * @private
     */
    private handleCallAnswered(call: Call): void {
        console.log('Handling call_answered event', { call });

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setActiveCall(call);
        callStore.setCallState('connecting');

        // Call custom handler if provided
        if (this.callEventHandlers.onCallAnswered) {
            this.callEventHandlers.onCallAnswered(call);
        }
    }

    /**
     * Handle call_declined event
     * Triggered when the other party declines the call
     * 
     * @private
     */
    private handleCallDeclined(call: Call): void {
        console.log('Handling call_declined event', { call });

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');

        // Call custom handler if provided
        if (this.callEventHandlers.onCallDeclined) {
            this.callEventHandlers.onCallDeclined(call);
        }

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
    private handleCallEnded(call: Call): void {
        console.log('Handling call_ended event', { call });

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');

        // Close WebRTC connection
        webrtcService.closePeerConnection();

        // Call custom handler if provided
        if (this.callEventHandlers.onCallEnded) {
            this.callEventHandlers.onCallEnded(call);
        }

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
    private handleCallFailed(call: Call): void {
        console.log('Handling call_failed event', { call });

        // Update call store
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');

        // Close WebRTC connection
        webrtcService.closePeerConnection();

        // Call custom handler if provided
        if (this.callEventHandlers.onCallFailed) {
            this.callEventHandlers.onCallFailed(call);
        }

        // Clean up call state
        setTimeout(() => {
            callStore.reset();
        }, 1000);
    }

    /**
     * Handle incoming signaling events
     * Routes signaling data to WebRTC service
     * 
     * @private
     */
    private handleSignalingEvent(payload: SignalingEventPayload): void {
        const { type, callId, fromUserId, toUserId, data } = payload;

        console.log(`Received signaling event: ${type}`, {
            callId,
            fromUserId,
            toUserId,
        });

        // Ignore signaling events not meant for this user
        if (toUserId !== this.currentUserId) {
            console.log('Ignoring signaling event not meant for this user');
            return;
        }

        // Route to appropriate handler
        switch (type) {
            case 'sdp_offer':
                this.handleSdpOffer(data, fromUserId);
                break;

            case 'sdp_answer':
                this.handleSdpAnswer(data, fromUserId);
                break;

            case 'ice_candidate':
                this.handleIceCandidate(data, fromUserId);
                break;

            default:
                console.warn(`Unknown signaling event type: ${type}`);
        }
    }

    /**
     * Handle SDP offer
     * Received when the caller sends their offer
     * 
     * @private
     */
    private async handleSdpOffer(
        offer: RTCSessionDescriptionInit,
        fromUserId: string
    ): Promise<void> {
        console.log('Handling SDP offer', { fromUserId });

        try {
            // Set remote description in WebRTC service
            await webrtcService.setRemoteDescription(offer);

            // Call custom handler if provided
            if (this.signalingEventHandlers.onSdpOffer) {
                this.signalingEventHandlers.onSdpOffer(offer, fromUserId);
            }
        } catch (error) {
            console.error('Error handling SDP offer:', error);
        }
    }

    /**
     * Handle SDP answer
     * Received when the callee sends their answer
     * 
     * @private
     */
    private async handleSdpAnswer(
        answer: RTCSessionDescriptionInit,
        fromUserId: string
    ): Promise<void> {
        console.log('Handling SDP answer', { fromUserId });

        try {
            // Set remote description in WebRTC service
            await webrtcService.setRemoteDescription(answer);

            // Call custom handler if provided
            if (this.signalingEventHandlers.onSdpAnswer) {
                this.signalingEventHandlers.onSdpAnswer(answer, fromUserId);
            }
        } catch (error) {
            console.error('Error handling SDP answer:', error);
        }
    }

    /**
     * Handle ICE candidate
     * Received when the peer discovers a new network path
     * 
     * @private
     */
    private async handleIceCandidate(
        candidate: RTCIceCandidateInit,
        fromUserId: string
    ): Promise<void> {
        console.log('Handling ICE candidate', { fromUserId });

        try {
            // Add ICE candidate to WebRTC service
            await webrtcService.addIceCandidate(candidate);

            // Call custom handler if provided
            if (this.signalingEventHandlers.onIceCandidate) {
                this.signalingEventHandlers.onIceCandidate(candidate, fromUserId);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    /**
     * Unsubscribe from call events
     * Cleans up the call events channel
     */
    async unsubscribeFromCallEvents(): Promise<void> {
        if (this.callEventsChannel) {
            console.log('Unsubscribing from call events channel');
            await supabase.removeChannel(this.callEventsChannel);
            this.callEventsChannel = null;
            this.callEventHandlers = {};
        }
    }

    /**
     * Unsubscribe from signaling events
     * Cleans up the signaling channel
     */
    async unsubscribeFromSignaling(): Promise<void> {
        if (this.signalingChannel) {
            console.log('Unsubscribing from signaling channel');
            await supabase.removeChannel(this.signalingChannel);
            this.signalingChannel = null;
            this.signalingEventHandlers = {};
        }
    }

    /**
     * Unsubscribe from all channels
     * Cleans up both call events and signaling channels
     */
    async unsubscribeAll(): Promise<void> {
        await Promise.all([
            this.unsubscribeFromCallEvents(),
            this.unsubscribeFromSignaling(),
        ]);
    }

    /**
     * Check if subscribed to call events
     */
    isSubscribedToCallEvents(): boolean {
        return this.callEventsChannel !== null;
    }

    /**
     * Check if subscribed to signaling
     */
    isSubscribedToSignaling(): boolean {
        return this.signalingChannel !== null;
    }
}

/**
 * Singleton instance of Call Realtime Service
 * Use this instance throughout the application
 */
export const callRealtimeService = new CallRealtimeService();
