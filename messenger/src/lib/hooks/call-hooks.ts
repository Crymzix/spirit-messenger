/**
 * Call hooks for WebRTC voice/video call management
 * Provides React Query hooks for call operations and real-time updates
 * 
 * Architecture:
 * - Mutations: All call operations (initiate, answer, decline, end, signal) go through Backend Service API
 * - Queries: Active call status fetched from Backend Service
 * - Real-time sync: Supabase Realtime WebSocket subscriptions notify UI of call state changes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    initiateCall,
    answerCall,
    declineCall,
    missedCall,
    endCall,
    sendSignal,
    getActiveCall,
    type SignalType,
} from '../services/call-service';
import type { CallType } from '@/types';

/**
 * Hook for initiating a new voice or video call
 * 
 * @example
 * const initiate = useCallInitiate();
 * await initiate.mutateAsync({ conversationId: '123', callType: 'voice' });
 */
export function useCallInitiate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            conversationId,
            callType,
        }: {
            conversationId: string;
            callType: CallType;
        }) => {
            return await initiateCall(conversationId, callType);
        },
        onSuccess: (call) => {
            // Invalidate active call query for this conversation
            queryClient.invalidateQueries({
                queryKey: ['activeCall', call.conversationId],
            });

            // Invalidate all active calls
            queryClient.invalidateQueries({
                queryKey: ['activeCall'],
            });
        },
        onError: (error) => {
            console.error('Failed to initiate call:', error);
        },
    });
}

/**
 * Hook for answering an incoming call
 * 
 * @example
 * const answer = useCallAnswer();
 * await answer.mutateAsync(callId);
 */
export function useCallAnswer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (callId: string) => {
            return await answerCall(callId);
        },
        onSuccess: (call) => {
            // Invalidate active call query for this conversation
            queryClient.invalidateQueries({
                queryKey: ['activeCall', call.conversationId],
            });

            // Invalidate all active calls
            queryClient.invalidateQueries({
                queryKey: ['activeCall'],
            });
        },
        onError: (error) => {
            console.error('Failed to answer call:', error);
        },
    });
}

/**
 * Hook for declining an incoming call
 * 
 * @example
 * const decline = useCallDecline();
 * await decline.mutateAsync(callId);
 */
export function useCallDecline() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (callId: string) => {
            return await declineCall(callId);
        },
        onSuccess: (call) => {
            // Invalidate active call query for this conversation
            queryClient.invalidateQueries({
                queryKey: ['activeCall', call.conversationId],
            });

            // Invalidate all active calls
            queryClient.invalidateQueries({
                queryKey: ['activeCall'],
            });
        },
        onError: (error) => {
            console.error('Failed to decline call:', error);
        },
    });
}

/**
 * Hook for marking a call as missed (timeout)
 * 
 * @example
 * const missed = useCallMissed();
 * await missed.mutateAsync(callId);
 */
export function useCallMissed() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (callId: string) => {
            return await missedCall(callId);
        },
        onSuccess: (call) => {
            // Invalidate active call query for this conversation
            queryClient.invalidateQueries({
                queryKey: ['activeCall', call.conversationId],
            });

            // Invalidate all active calls
            queryClient.invalidateQueries({
                queryKey: ['activeCall'],
            });
        },
        onError: (error) => {
            console.error('Failed to mark call as missed:', error);
        },
    });
}

/**
 * Hook for ending an active call
 * 
 * @example
 * const end = useCallEnd();
 * await end.mutateAsync(callId);
 */
export function useCallEnd() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (callId: string) => {
            return await endCall(callId);
        },
        onSuccess: (call) => {
            // Invalidate active call query for this conversation
            queryClient.invalidateQueries({
                queryKey: ['activeCall', call.conversationId],
            });

            // Invalidate all active calls
            queryClient.invalidateQueries({
                queryKey: ['activeCall'],
            });
        },
        onError: (error) => {
            console.error('Failed to end call:', error);
        },
    });
}

/**
 * Hook for sending WebRTC signaling data (SDP offer/answer or ICE candidate)
 * 
 * @example
 * const signal = useCallSignal();
 * await signal.mutateAsync({
 *   callId: '123',
 *   signalType: 'offer',
 *   signalData: sdpOffer,
 *   targetUserId: 'user456'
 * });
 */
export function useCallSignal() {
    return useMutation({
        mutationFn: async ({
            callId,
            signalType,
            signalData,
            targetUserId,
        }: {
            callId: string;
            signalType: SignalType;
            signalData: any;
            targetUserId: string;
        }) => {
            return await sendSignal(callId, signalType, signalData, targetUserId);
        },
        onError: (error) => {
            console.error('Failed to send signal:', error);
        },
    });
}

/**
 * Hook for fetching the active call for a conversation
 * Returns null if no active call exists
 * 
 * @example
 * const { data: activeCall, isLoading } = useActiveCall(conversationId);
 */
export function useActiveCall(conversationId: string) {
    return useQuery({
        queryKey: ['activeCall', conversationId],
        queryFn: async () => {
            return await getActiveCall(conversationId);
        },
        // Refetch every 5 seconds to keep call state fresh
        refetchInterval: 5000,
        // Don't refetch on window focus to avoid unnecessary API calls during active calls
        refetchOnWindowFocus: false,
        // Retry once on failure
        retry: 1,
        // Keep data fresh for 3 seconds
        staleTime: 3000,
    });
}
