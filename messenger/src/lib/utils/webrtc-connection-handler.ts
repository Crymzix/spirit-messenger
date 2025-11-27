/**
 * WebRTC Connection State Handler
 * Manages connection state changes, reconnection logic, and error handling
 * 
 * Requirements: 4.3, 4.4, 4.5, 11.2, 11.3, 11.4
 */

import { useCallStore } from '@/lib/store/call-store';
import { webrtcService } from '@/lib/services/webrtc-service';

/**
 * Reconnection configuration
 */
const RECONNECTION_TIMEOUT = 5000; // 5 seconds
const RECONNECTION_CHECK_INTERVAL = 500; // Check every 500ms

/**
 * Connection state handler class
 * Manages reconnection attempts and error handling for WebRTC connections
 */
export class WebRTCConnectionHandler {
    private reconnectionTimer: NodeJS.Timeout | null = null;
    private reconnectionStartTime: number | null = null;
    private isReconnecting = false;
    private onCallEnd?: () => void;
    private onDisplayError?: (message: string) => void;

    /**
     * Set callback for when call should end
     */
    setOnCallEnd(callback: () => void): void {
        this.onCallEnd = callback;
    }

    /**
     * Set callback for displaying error messages
     */
    setOnDisplayError(callback: (message: string) => void): void {
        this.onDisplayError = callback;
    }

    /**
     * Handle connection state changes
     * Implements reconnection logic and error handling
     * 
     * @param state - The new connection state
     */
    handleConnectionStateChange(state: RTCPeerConnectionState): void {
        console.log('Connection state changed:', state);

        const callStore = useCallStore.getState();
        callStore.setConnectionState(state as any);

        switch (state) {
            case 'connected':
                this.handleConnected();
                break;

            case 'disconnected':
                this.handleDisconnected();
                break;

            case 'failed':
                this.handleFailed();
                break;

            case 'closed':
                this.handleClosed();
                break;

            default:
                // Other states: 'new', 'connecting' - no special handling needed
                break;
        }
    }

    /**
     * Handle 'connected' state
     * Connection successfully established
     */
    private handleConnected(): void {
        console.log('WebRTC connection established successfully');

        // Clear any reconnection attempts
        this.clearReconnection();

        // Update call state to active
        const callStore = useCallStore.getState();
        callStore.setCallState('active');
    }

    /**
     * Handle 'disconnected' state
     * Attempt reconnection for 5 seconds
     */
    private handleDisconnected(): void {
        console.log('WebRTC connection disconnected, attempting reconnection...');

        // Don't start multiple reconnection attempts
        if (this.isReconnecting) {
            console.log('Already attempting reconnection');
            return;
        }

        this.isReconnecting = true;
        this.reconnectionStartTime = Date.now();

        // Start reconnection monitoring
        this.reconnectionTimer = setInterval(() => {
            this.checkReconnectionStatus();
        }, RECONNECTION_CHECK_INTERVAL);
    }

    /**
     * Check reconnection status
     * Called periodically during reconnection attempts
     */
    private checkReconnectionStatus(): void {
        const connectionState = webrtcService.getConnectionState();
        const elapsed = Date.now() - (this.reconnectionStartTime || 0);

        // Check if reconnected
        if (connectionState === 'connected') {
            console.log('Reconnection successful');
            this.clearReconnection();
            this.handleConnected();
            return;
        }

        // Check if timeout exceeded
        if (elapsed >= RECONNECTION_TIMEOUT) {
            console.error('Reconnection timeout exceeded');
            this.clearReconnection();
            this.handleReconnectionFailed();
            return;
        }

        console.log(`Reconnection attempt in progress... (${elapsed}ms / ${RECONNECTION_TIMEOUT}ms)`);
    }

    /**
     * Handle reconnection failure
     * Called when reconnection timeout is exceeded
     */
    private handleReconnectionFailed(): void {
        console.error('Failed to reconnect within timeout period');

        // Display error message
        this.displayError('Connection lost. Unable to reconnect.');

        // End the call
        this.endCall();
    }

    /**
     * Handle 'failed' state
     * Connection failed, display error and end call
     */
    private handleFailed(): void {
        console.error('WebRTC connection failed');

        // Clear any reconnection attempts
        this.clearReconnection();

        // Display error message
        this.displayError('Connection failed. Please check your network.');

        // End the call
        this.endCall();
    }

    /**
     * Handle 'closed' state
     * Connection was closed (normal termination)
     */
    private handleClosed(): void {
        console.log('WebRTC connection closed');

        // Clear any reconnection attempts
        this.clearReconnection();

        // Update call state
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');
    }

    /**
     * Clear reconnection timer and state
     */
    private clearReconnection(): void {
        if (this.reconnectionTimer) {
            clearInterval(this.reconnectionTimer);
            this.reconnectionTimer = null;
        }
        this.isReconnecting = false;
        this.reconnectionStartTime = null;
    }

    /**
     * Display error message to user
     * Uses callback if provided, otherwise falls back to console.error
     */
    private displayError(message: string): void {
        if (this.onDisplayError) {
            this.onDisplayError(message);
        } else {
            console.error('Connection error:', message);
            // Fallback to alert if no callback is provided
            alert(message);
        }
    }

    /**
     * End the call
     * Closes WebRTC connection and resets call state
     */
    private endCall(): void {
        console.log('Ending call due to connection failure');

        // Close WebRTC connection
        webrtcService.closePeerConnection();

        // Update call state
        const callStore = useCallStore.getState();
        callStore.setCallState('ended');

        // Call the onCallEnd callback if provided
        if (this.onCallEnd) {
            this.onCallEnd();
        }

        // Reset call store after a short delay
        setTimeout(() => {
            callStore.reset();
        }, 1000);
    }

    /**
     * Clean up resources
     * Should be called when component unmounts
     */
    cleanup(): void {
        this.clearReconnection();
        this.onCallEnd = undefined;
        this.onDisplayError = undefined;
    }
}

/**
 * Create a connection state change handler
 * Returns a function that can be used as onConnectionStateChange callback
 * 
 * @param onCallEnd - Optional callback when call should end
 * @param onDisplayError - Optional callback for displaying error messages
 * @returns Handler function and cleanup function
 */
export function createConnectionStateHandler(
    onCallEnd?: () => void,
    onDisplayError?: (message: string) => void
): {
    handler: (state: RTCPeerConnectionState) => void;
    cleanup: () => void;
} {
    const connectionHandler = new WebRTCConnectionHandler();

    if (onCallEnd) {
        connectionHandler.setOnCallEnd(onCallEnd);
    }

    if (onDisplayError) {
        connectionHandler.setOnDisplayError(onDisplayError);
    }

    return {
        handler: (state: RTCPeerConnectionState) => {
            connectionHandler.handleConnectionStateChange(state);
        },
        cleanup: () => {
            connectionHandler.cleanup();
        },
    };
}

/**
 * Handle remote stream event
 * Updates call store with remote stream
 * 
 * @param stream - The remote media stream
 */
export function handleRemoteStream(stream: MediaStream): void {
    console.log('Received remote stream with tracks:', stream.getTracks().length);

    // Log track details
    stream.getTracks().forEach(track => {
        console.log(`Remote track: ${track.kind} - ${track.label} (enabled: ${track.enabled})`);
    });

    // Update call store with remote stream
    const callStore = useCallStore.getState();
    callStore.setRemoteStream(stream);
}

/**
 * Handle ICE connection state changes
 * Provides additional connection diagnostics
 * 
 * @param state - The new ICE connection state
 */
export function handleIceConnectionStateChange(state: RTCIceConnectionState): void {
    console.log('ICE connection state changed:', state);

    const callStore = useCallStore.getState();
    callStore.setIceConnectionState(state as any);

    // Log additional diagnostics for certain states
    switch (state) {
        case 'checking':
            console.log('ICE is checking connectivity...');
            break;
        case 'connected':
            console.log('ICE connection established');
            break;
        case 'completed':
            console.log('ICE gathering completed');
            break;
        case 'failed':
            console.error('ICE connection failed');
            break;
        case 'disconnected':
            console.warn('ICE connection disconnected');
            break;
        case 'closed':
            console.log('ICE connection closed');
            break;
    }
}
