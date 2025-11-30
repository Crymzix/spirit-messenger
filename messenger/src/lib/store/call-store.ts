/**
 * Global call state management using Zustand
 * Handles WebRTC call state, media streams, and connection status
 * Used for voice and video call functionality
 */

import { create } from 'zustand';
import type { Call } from '@/types';

export type CallState =
    | 'idle'           // No active call
    | 'initiating'     // Initiating a call
    | 'ringing'        // Incoming call ringing
    | 'connecting'     // Establishing connection
    | 'active'         // Call is active
    | 'ended';         // Call has ended

export type ConnectionState =
    | 'new'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'failed'
    | 'closed';

export type IceConnectionState =
    | 'new'
    | 'checking'
    | 'connected'
    | 'completed'
    | 'failed'
    | 'disconnected'
    | 'closed';

interface CallStoreState {
    // Call data
    activeCall: Call | null;
    callState: CallState;

    // Media streams
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;

    // Media controls
    isMuted: boolean;
    isCameraOff: boolean;

    // Connection state
    connectionState: ConnectionState;
    iceConnectionState: IceConnectionState;

    // Actions
    setActiveCall: (call: Call | null) => void;
    setCallState: (state: CallState) => void;
    setLocalStream: (stream: MediaStream | null) => void;
    setRemoteStream: (stream: MediaStream | null) => void;
    toggleMute: () => void;
    toggleCamera: () => void;
    setConnectionState: (state: ConnectionState) => void;
    setIceConnectionState: (state: IceConnectionState) => void;
    reset: () => void;
}

/**
 * Global call store
 * Manages WebRTC call state, media streams, and connection status
 */
export const useCallStore = create<CallStoreState>((set, get) => ({
    // Initial state
    activeCall: null,
    callState: 'idle',
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
    connectionState: 'new',
    iceConnectionState: 'new',

    /**
     * Set the active call
     */
    setActiveCall: (call: Call | null) => {
        set({ activeCall: call });
    },

    /**
     * Set the call state
     */
    setCallState: (state: CallState) => {
        set({ callState: state });
    },

    /**
     * Set the local media stream
     */
    setLocalStream: (stream: MediaStream | null) => {
        set({ localStream: stream });
    },

    /**
     * Set the remote media stream
     */
    setRemoteStream: (stream: MediaStream | null) => {
        set({ remoteStream: stream });
    },

    /**
     * Toggle mute state
     * Modifies the audio track enabled state in the local stream via WebRTC service
     */
    toggleMute: () => {
        const { isMuted } = get();
        const newMutedState = !isMuted;

        // Lazy load simplePeerService to avoid circular dependency
        const { simplePeerService } = require('@/lib/services/simple-peer-service');

        // Update the audio track via simple-peer service
        const success = simplePeerService.toggleMute(newMutedState);

        // Only update state if the operation succeeded
        if (success) {
            set({ isMuted: newMutedState });
        }
    },

    /**
     * Toggle camera state
     * Modifies the video track enabled state in the local stream via simple-peer service
     */
    toggleCamera: () => {
        const { isCameraOff } = get();
        const newCameraOffState = !isCameraOff;

        // Lazy load simplePeerService to avoid circular dependency
        const { simplePeerService } = require('@/lib/services/simple-peer-service');

        // Update the video track via simple-peer service
        const success = simplePeerService.toggleCamera(newCameraOffState);

        // Only update state if the operation succeeded
        if (success) {
            set({ isCameraOff: newCameraOffState });
        }
    },

    /**
     * Set the RTCPeerConnection state
     */
    setConnectionState: (state: ConnectionState) => {
        set({ connectionState: state });
    },

    /**
     * Set the ICE connection state
     */
    setIceConnectionState: (state: IceConnectionState) => {
        set({ iceConnectionState: state });
    },

    /**
     * Reset all call state
     * Clears active call, streams, and resets all flags
     */
    reset: () => {
        const { localStream, remoteStream } = get();

        // Stop all tracks in local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        // Stop all tracks in remote stream
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
        }

        set({
            activeCall: null,
            callState: 'idle',
            localStream: null,
            remoteStream: null,
            isMuted: false,
            isCameraOff: false,
            connectionState: 'new',
            iceConnectionState: 'new',
        });
    },
}));

/**
 * Hook to get the active call
 */
export function useActiveCall(): Call | null {
    return useCallStore((state) => state.activeCall);
}

/**
 * Hook to get the call state
 */
export function useCallState(): CallState {
    return useCallStore((state) => state.callState);
}

/**
 * Hook to get the local stream
 */
export function useLocalStream(): MediaStream | null {
    return useCallStore((state) => state.localStream);
}

/**
 * Hook to get the remote stream
 */
export function useRemoteStream(): MediaStream | null {
    return useCallStore((state) => state.remoteStream);
}

/**
 * Hook to get mute state
 */
export function useIsMuted(): boolean {
    return useCallStore((state) => state.isMuted);
}

/**
 * Hook to get camera state
 */
export function useIsCameraOff(): boolean {
    return useCallStore((state) => state.isCameraOff);
}

/**
 * Hook to get connection state
 */
export function useConnectionState(): ConnectionState {
    return useCallStore((state) => state.connectionState);
}

/**
 * Hook to get ICE connection state
 */
export function useIceConnectionState(): IceConnectionState {
    return useCallStore((state) => state.iceConnectionState);
}

/**
 * Hook to check if there's an active call
 */
export function useHasActiveCall(): boolean {
    return useCallStore((state) => state.activeCall !== null);
}
