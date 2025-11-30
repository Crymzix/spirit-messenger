import { useState } from 'react';
import { useCallAnswer, useCallDecline, useCallSignal } from './call-hooks';
import { useCallStore } from '../store/call-store';
import { simplePeerService } from '../services/simple-peer-service';
import { supabase } from '../supabase';
import type { CallType } from '@/types';

interface UseIncomingCallHandlerProps {
    callId: string;
    callType: CallType;
    callerId: string;
    conversationId: string;
}

export function useIncomingCallHandler({
    callId,
    callType,
    callerId,
}: UseIncomingCallHandlerProps) {
    const answerMutation = useCallAnswer();
    const declineMutation = useCallDecline();
    const signalMutation = useCallSignal();
    const callStore = useCallStore();
    const [callError, setCallError] = useState<string | null>(null);

    const handleAnswer = async () => {
        try {
            // Step 1: Answer via backend API
            const call = await answerMutation.mutateAsync(callId);

            // Step 2: Update call store
            callStore.setActiveCall(call);
            callStore.setCallState('connecting');

            // Step 3: Get media permissions
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: callType === 'video' ? {
                    width: 640,
                    height: 480,
                    frameRate: 15,
                } : false,
            };

            let localStream: MediaStream;
            try {
                localStream = await navigator.mediaDevices.getUserMedia(constraints);
                callStore.setLocalStream(localStream);
                console.log('Local stream obtained');
            } catch (mediaError: any) {
                console.error('Media permission error:', mediaError);

                // Display error
                setCallError(mediaError.message || 'Failed to access microphone/camera');

                // Decline the call since we can't proceed without media
                try {
                    await declineMutation.mutateAsync(callId);
                } catch (declineError) {
                    console.error('Failed to decline call after media error:', declineError);
                }

                // Reset call store
                callStore.reset();

                // Error will remain displayed
                return;
            }

            // Step 4: Set up simple-peer event handlers BEFORE creating peer
            // This ensures handlers are attached when peer fires events
            console.log('Setting up event handlers');
            simplePeerService.setEventHandlers({
                onSignal: async (signalData) => {
                    // This fires after we call peer.signal() with initiator's signal
                    // Send our answer signal via backend API
                    console.log('Sending signal to caller');
                    await signalMutation.mutateAsync({
                        callId,
                        signalType: 'signal',
                        signalData: signalData,
                        targetUserId: callerId,
                    });
                },
                onStream: (stream) => {
                    // Receive remote stream from peer
                    console.log('Received remote stream');
                    callStore.setRemoteStream(stream);
                    callStore.setCallState('active');
                },
                onConnect: () => {
                    console.log('Peer connection established');
                    callStore.setCallState('active');
                },
                onError: (error) => {
                    console.error('Peer connection error:', error);
                    setCallError('Connection failed');
                },
                onClose: () => {
                    console.log('Peer connection closed');
                },
            });

            // Step 5: Create simple-peer instance as non-initiator (receiver)
            console.log('Creating peer connection');
            simplePeerService.createPeer({
                initiator: false,
                stream: localStream,
            });

            // Step 6: Subscribe to signaling events via Realtime
            console.log('Subscribing to signaling events');

            // Get current user ID from auth
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }
        } catch (error) {
            console.error('Failed to answer call:', error);
            setCallError('Failed to answer call. Please try again.');
        }
    };

    const handleDecline = async () => {
        await declineMutation.mutateAsync(callId);
    };

    return {
        handleAnswer,
        handleDecline,
        isAnswering: answerMutation.isPending,
        isDeclining: declineMutation.isPending,
        callError,
    };
}
