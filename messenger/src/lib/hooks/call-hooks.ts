/**
 * Call hooks for WebRTC voice/video call management
 * Provides React Query hooks for call operations and real-time updates
 * 
 * Architecture:
 * - Mutations: All call operations (initiate, answer, decline, end, signal) go through Backend Service API
 * - Queries: Active call status fetched from Backend Service
 * - Real-time sync: Supabase Realtime WebSocket subscriptions notify UI of call state changes
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    initiateCall,
    answerCall,
    declineCall,
    missedCall,
    endCall,
    sendSignal,
    getActiveCall,
    getIceServers,
    type SignalType,
    type IceServer,
} from '../services/call-service';
import type { CallType } from '@/types';
import { supabase } from '../supabase';
import { useCallStore } from '../store/call-store';
import { soundService } from '../services/sound-service';
import { emit } from '@tauri-apps/api/event';
import { WINDOW_EVENTS } from '../utils/constants';
import { useUser } from './auth-hooks';

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

            // Reset call store when declining
            const callStore = useCallStore.getState();
            callStore.reset();
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

            // Reset call store when call is missed
            const callStore = useCallStore.getState();
            callStore.reset();
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

            // Reset call store when call is ended
            const callStore = useCallStore.getState();
            callStore.reset();
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

/**
 * Hook for fetching ICE servers for WebRTC connection
 * Returns STUN/TURN servers from Twilio
 *
 * @example
 * const { data: iceServers, isLoading } = useIceServers();
 */
export function useIceServers() {
    return useQuery<IceServer[]>({
        queryKey: ['iceServers'],
        queryFn: async () => {
            return await getIceServers();
        },
        // Cache ICE servers for 1 hour (they have 24h TTL from Twilio)
        staleTime: 60 * 60 * 1000,
        // Keep in cache for 2 hours
        gcTime: 2 * 60 * 60 * 1000,
        // Retry once on failure
        retry: 1,
        // Don't refetch on window focus
        refetchOnWindowFocus: false,
    });
}

export function useCallSignalUpdates(
    callId: string | undefined,
    onSignal: (signalData: any, fromUserId: string) => void
) {
    const { data: user } = useUser();

    useEffect(() => {
        if (!callId) {
            return
        }
        if (!user) {
            return
        }

        // Create a new channel for signaling events specific to this call
        // Use call ID in channel name to isolate signaling per call
        const signalingChannel = supabase.channel(`call-signaling:${callId}`);

        // Listen for signaling broadcasts (bundled signal events)
        signalingChannel
            .on(
                'broadcast',
                { event: 'signal' },
                (payload: { payload: SignalPayload }) => {
                    console.log('Received signaling event payload for call', payload)
                    const { fromUserId, targetUserId, data } = payload.payload;

                    // Verify the signal is for the current user
                    if (targetUserId && targetUserId !== user?.id) {
                        console.log('Ignoring signaling event not meant for this user');
                        return;
                    }

                    onSignal(data, fromUserId)
                }
            );

        // Subscribe to the channel
        signalingChannel.subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log(`Subscribed to signaling channel for call ${callId}`);
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Error subscribing to signaling channel', err);
            } else if (status === 'TIMED_OUT') {
                console.error('Timed out subscribing to signaling channel', err);
            }
        });

        return () => {
            signalingChannel.unsubscribe().catch((error) => {
                console.error('Error unsubscribing from call signal channel:', error);
            });
        };
    }, [callId, user])
}

/**
 * Global hook for listening to call-related broadcasts from Supabase Realtime
 * Sets up listeners for incoming calls, call state changes, and signaling events
 * Should be called once in the main window component
 *
 * @example
 * useCallUpdates(); // Call in MainWindow
 */
export function useCallUpdates() {
    const { data: user } = useUser()
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user) {
            console.log('User not authenticated, skipping broadcast listener setup');
            return;
        }

        // Subscribe to user's call events channel for call broadcasts
        const channel = supabase.channel(`call-events:${user.id}`);
        channel
            .on(
                'broadcast',
                { event: '*' },
                async (payload) => {
                    console.log('📡 Broadcast event received:', payload);

                    switch (payload.event) {
                        case 'call_ringing': {
                            const { conversationId } = payload.payload;

                            console.log('Received call ringing event');

                            // Start looping ringing sound via SoundService
                            try {
                                await soundService.startLooping('video_call', 7000);
                            } catch (error) {
                                console.error('Failed to start ringing loop:', error);
                            }

                            // Invalidate messages to show new ringing message
                            queryClient.invalidateQueries({
                                queryKey: ['messages', 'conversation', conversationId],
                            });
                            break;
                        }

                        case 'call_answered': {
                            const { conversationId } = payload.payload;
                            console.log('Received call answered event');

                            // Stop any playing ringing sound
                            soundService.stopLooping();

                            // Invalidate messages to show updated status
                            queryClient.invalidateQueries({
                                queryKey: ['messages', 'conversation', conversationId],
                            });
                            break;
                        }

                        case 'call_declined': {
                            const { conversationId } = payload.payload;
                            console.log('Received call declined event');

                            // Stop any playing ringing sound
                            soundService.stopLooping();

                            // Invalidate messages to show updated status
                            queryClient.invalidateQueries({
                                queryKey: ['messages', 'conversation', conversationId],
                            });
                            break;
                        }

                        case 'call_missed': {
                            const { conversationId } = payload.payload;
                            console.log('Received call missed event');

                            // Stop any playing ringing sound
                            soundService.stopLooping();

                            // Invalidate messages to show updated status
                            queryClient.invalidateQueries({
                                queryKey: ['messages', 'conversation', conversationId],
                            });
                            break;
                        }

                        case 'call_ended': {
                            const { conversationId } = payload.payload;
                            console.log('Received call ended event');

                            // Stop any playing ringing sound
                            soundService.stopLooping();

                            // Invalidate messages to show updated status
                            queryClient.invalidateQueries({
                                queryKey: ['messages', 'conversation', conversationId],
                            });
                            break;
                        }
                    }

                    await emit(WINDOW_EVENTS.CALL_EVENTS, payload)
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe().catch((error) => {
                console.error('Error unsubscribing from call broadcast channel:', error);
            });
        };
    }, [user, queryClient]);
}
