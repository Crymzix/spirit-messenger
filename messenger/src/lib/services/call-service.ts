/**
 * Call service for WebRTC voice/video call management
 * Handles call initiation, answering, declining, ending, and signaling
 * 
 * Architecture:
 * - Write operations: All call operations go through Backend Service API
 * - Read operations: Frontend reads directly from Supabase for real-time updates
 * - Real-time sync: Supabase Realtime WebSocket subscriptions notify UI of changes
 */

import { apiPost, apiGet } from '../api-client';
import type { Call, CallType, CallWithParticipants } from '@/types';

export type SignalType = 'offer' | 'answer' | 'ice-candidate';

export interface InitiateCallData {
    conversationId: string;
    callType: CallType;
}

export interface InitiateCallResponse {
    call: Call;
}

export interface AnswerCallResponse {
    call: Call;
}

export interface DeclineCallResponse {
    call: Call;
}

export interface EndCallResponse {
    call: Call;
}

export interface SignalData {
    type: SignalType;
    data: any;
    targetUserId: string;
}

export interface SendSignalResponse {
    success: boolean;
}

export interface GetActiveCallResponse {
    call: CallWithParticipants | null;
}

/**
 * Initiate a new voice or video call
 */
export async function initiateCall(
    conversationId: string,
    callType: CallType
): Promise<Call> {
    const response = await apiPost<InitiateCallResponse>(
        '/api/calls/initiate',
        {
            conversation_id: conversationId,
            call_type: callType,
        }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to initiate call');
    }

    return response.data.call;
}

/**
 * Answer an incoming call
 */
export async function answerCall(callId: string): Promise<Call> {
    const response = await apiPost<AnswerCallResponse>(
        `/api/calls/${callId}/answer`,
        {}
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to answer call');
    }

    return response.data.call;
}

/**
 * Decline an incoming call
 */
export async function declineCall(callId: string): Promise<Call> {
    const response = await apiPost<DeclineCallResponse>(
        `/api/calls/${callId}/decline`,
        {}
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to decline call');
    }

    return response.data.call;
}

/**
 * Mark a call as missed (timeout)
 */
export async function missedCall(callId: string): Promise<Call> {
    const response = await apiPost<DeclineCallResponse>(
        `/api/calls/${callId}/missed`,
        {}
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to mark call as missed');
    }

    return response.data.call;
}

/**
 * End an active call
 */
export async function endCall(callId: string): Promise<Call> {
    const response = await apiPost<EndCallResponse>(
        `/api/calls/${callId}/end`,
        {}
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to end call');
    }

    return response.data.call;
}

/**
 * Send WebRTC signaling data (SDP offer/answer or ICE candidate)
 */
export async function sendSignal(
    callId: string,
    signalType: SignalType,
    signalData: any,
    targetUserId: string
): Promise<boolean> {
    const response = await apiPost<SendSignalResponse>(
        `/api/calls/${callId}/signal`,
        {
            type: signalType,
            data: signalData,
            target_user_id: targetUserId,
        }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to send signal');
    }

    return response.data.success;
}

/**
 * Get the active call for a conversation (if any)
 */
export async function getActiveCall(
    conversationId: string
): Promise<CallWithParticipants | null> {
    const response = await apiGet<GetActiveCallResponse>(
        `/api/calls/active/${conversationId}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get active call');
    }

    return response.data.call;
}
