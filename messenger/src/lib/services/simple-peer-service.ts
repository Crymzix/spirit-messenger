/**
 * Simple Peer Service
 * Wrapper around simple-peer library for WebRTC peer connections
 * Handles peer-to-peer media streaming with simplified signaling
 */

import SimplePeer from 'simple-peer';

/**
 * Configuration for creating a SimplePeer instance
 */
export interface SimplePeerConfig {
    initiator: boolean;
    stream?: MediaStream;
    config?: RTCConfiguration;
}

/**
 * Event handler callbacks for SimplePeer events
 */
export interface SimplePeerEventHandlers {
    onSignal?: (signalData: any) => void;
    onStream?: (stream: MediaStream) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
    onConnect?: () => void;
}

/**
 * Simple Peer Service Class
 * Manages SimplePeer instances for WebRTC connections
 */
export class SimplePeerService {
    private peer: SimplePeer.Instance | null = null;
    private localStream: MediaStream | null = null;
    private eventHandlers: SimplePeerEventHandlers = {};

    /**
     * Create a new SimplePeer instance
     * @param config - Configuration for the peer (initiator flag, local stream)
     */
    createPeer(config: SimplePeerConfig): void {
        // Close existing peer if any
        if (this.peer) {
            this.destroy();
        }

        // Store local stream
        this.localStream = config.stream || null;

        // Create SimplePeer instance with proper configuration
        this.peer = new SimplePeer({
            initiator: config.initiator,
            stream: config.stream,
            trickle: true, // Enable trickle ICE for faster connection establishment,
            config: {
                iceServers: [
                    {
                        urls: "stun:global.stun.twilio.com:3478",
                    },
                    {
                        credential: "MIxGUSx8bUHiyjMWtzL+lTGAS6LfHcj3VxiGlSRLsEE=",
                        urls: "turn:global.turn.twilio.com:3478?transport=udp",
                        username: "409b6de8e512fe8220b8188e9c346b5e7eba833bf6ee3f8b93a439f45d674167"
                    },
                    {
                        credential: "MIxGUSx8bUHiyjMWtzL+lTGAS6LfHcj3VxiGlSRLsEE=",
                        urls: "turn:global.turn.twilio.com:3478?transport=tcp",
                        username: "409b6de8e512fe8220b8188e9c346b5e7eba833bf6ee3f8b93a439f45d674167"
                    },
                    {
                        credential: "MIxGUSx8bUHiyjMWtzL+lTGAS6LfHcj3VxiGlSRLsEE=",
                        urls: "turn:global.turn.twilio.com:443?transport=tcp",
                        username: "409b6de8e512fe8220b8188e9c346b5e7eba833bf6ee3f8b93a439f45d674167"
                    }
                ]
            }
        });

        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for the SimplePeer instance
     * @private
     */
    private setupEventListeners(): void {
        if (!this.peer) {
            throw new Error('Peer instance not initialized');
        }

        const peer = this.peer;

        // Handle signal events (includes SDP and ICE candidates)
        peer.on('signal', (signalData: any) => {
            console.log('SimplePeer signal event:', signalData);
            if (this.eventHandlers.onSignal) {
                this.eventHandlers.onSignal(signalData);
            }
        });

        // Handle remote stream
        peer.on('stream', (stream: MediaStream) => {
            console.log('SimplePeer received remote stream with tracks:', stream.getTracks().length);
            if (this.eventHandlers.onStream) {
                this.eventHandlers.onStream(stream);
            }
        });

        // Handle connection established
        peer.on('connect', () => {
            console.log('SimplePeer connection established');
            if (this.eventHandlers.onConnect) {
                this.eventHandlers.onConnect();
            }
        });

        // Handle errors
        peer.on('error', (error: Error) => {
            console.error('SimplePeer error:', error);
            if (this.eventHandlers.onError) {
                this.eventHandlers.onError(error);
            }
        });

        // Handle close
        peer.on('close', () => {
            console.log('SimplePeer connection closed');
            if (this.eventHandlers.onClose) {
                this.eventHandlers.onClose();
            }
        });
    }

    /**
     * Set event handlers for SimplePeer events
     * @param handlers - Event handler callbacks
     */
    setEventHandlers(handlers: SimplePeerEventHandlers): void {
        this.eventHandlers = handlers;
    }

    /**
     * Signal the peer with remote signal data
     * Called when receiving signal data from the remote peer
     * @param signalData - Signal data from remote peer (includes SDP and/or ICE candidates)
     */
    signal(signalData: any): void {
        if (!this.peer) {
            console.error('Cannot signal: peer not initialized');
            return;
        }

        try {
            console.log('Signaling peer with data:', signalData);
            this.peer.signal(signalData);
        } catch (error) {
            console.error('Error signaling peer:', error);
        }
    }

    /**
     * Destroy the peer connection and clean up resources
     * Closes the connection and stops all tracks
     */
    destroy(): void {
        if (this.peer) {
            try {
                this.peer.destroy();
            } catch (error) {
                console.error('Error destroying peer:', error);
            }
            this.peer = null;
        }

        // Stop local stream tracks
        this.stopLocalStream();

        // Clear event handlers
        this.eventHandlers = {};
    }

    /**
     * Stop all tracks in the local media stream
     * @private
     */
    private stopLocalStream(): void {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
            });
            this.localStream = null;
        }
    }

    /**
     * Get the current SimplePeer instance
     * @returns SimplePeer instance or null if not initialized
     */
    getPeer(): SimplePeer.Instance | null {
        return this.peer;
    }

    /**
     * Get the current local stream
     * @returns MediaStream or null if not initialized
     */
    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    /**
     * Check if peer is connected
     * @returns true if peer exists
     */
    isConnected(): boolean {
        return this.peer !== null;
    }

    /**
     * Toggle mute state for audio track
     * Enables or disables the audio track in the local stream
     * @param muted - true to mute, false to unmute
     * @returns true if operation succeeded, false otherwise
     */
    toggleMute(muted: boolean): boolean {
        if (!this.localStream) {
            console.warn('Cannot toggle mute: no local stream available');
            return false;
        }

        const audioTracks = this.localStream.getAudioTracks();

        if (audioTracks.length === 0) {
            console.warn('Cannot toggle mute: no audio tracks in local stream');
            return false;
        }

        // Set enabled state for all audio tracks
        audioTracks.forEach(track => {
            track.enabled = !muted;
        });

        console.log(`Audio ${muted ? 'muted' : 'unmuted'}`);
        return true;
    }

    /**
     * Toggle camera state for video track
     * Enables or disables the video track in the local stream
     * @param cameraOff - true to turn camera off, false to turn on
     * @returns true if operation succeeded, false otherwise
     */
    toggleCamera(cameraOff: boolean): boolean {
        if (!this.localStream) {
            console.warn('Cannot toggle camera: no local stream available');
            return false;
        }

        const videoTracks = this.localStream.getVideoTracks();

        if (videoTracks.length === 0) {
            console.warn('Cannot toggle camera: no video tracks in local stream');
            return false;
        }

        // Set enabled state for all video tracks
        videoTracks.forEach(track => {
            track.enabled = !cameraOff;
        });

        console.log(`Camera ${cameraOff ? 'disabled' : 'enabled'}`);
        return true;
    }
}

/**
 * Singleton instance of Simple Peer Service
 * Use this instance throughout the application
 */
export const simplePeerService = new SimplePeerService();
