/**
 * WebRTC Service
 * Handles peer-to-peer WebRTC connections for voice and video calls
 * Manages RTCPeerConnection, media streams, and signaling
 */

/**
 * STUN server configuration
 * Uses Google and Mozilla public STUN servers for NAT traversal
 */
const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
];

/**
 * Media constraints for getUserMedia
 */
export interface MediaConstraints {
    audio: boolean | MediaTrackConstraints;
    video: boolean | MediaTrackConstraints;
}

/**
 * Event handlers for WebRTC events
 */
export interface WebRTCEventHandlers {
    onIceCandidate?: (candidate: RTCIceCandidate) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
    onRemoteStream?: (stream: MediaStream) => void;
}

/**
 * WebRTC Service Class
 * Manages WebRTC peer connections and media streams
 */
export class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private eventHandlers: WebRTCEventHandlers = {};
    private pendingIceCandidates: RTCIceCandidate[] = [];

    /**
     * Create a new RTCPeerConnection with STUN server configuration
     * Sets up event listeners for ICE candidates, connection state changes, and remote tracks
     */
    createPeerConnection(): RTCPeerConnection {
        // Close existing connection if any
        if (this.peerConnection) {
            this.closePeerConnection();
        }

        // Create new peer connection with STUN servers
        this.peerConnection = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
        });

        // Set up event listeners
        this.setupEventListeners();

        return this.peerConnection;
    }

    /**
     * Set up event listeners for the peer connection
     * Handles ICE candidates, connection state changes, and remote tracks
     */
    private setupEventListeners(): void {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized');
        }

        // Handle ICE candidate events
        this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
            if (event.candidate && this.eventHandlers.onIceCandidate) {
                this.eventHandlers.onIceCandidate(event.candidate);
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection && this.eventHandlers.onConnectionStateChange) {
                this.eventHandlers.onConnectionStateChange(this.peerConnection.connectionState);
            }
        };

        // Handle ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            if (this.peerConnection && this.eventHandlers.onIceConnectionStateChange) {
                this.eventHandlers.onIceConnectionStateChange(this.peerConnection.iceConnectionState);
            }
        };

        // Handle remote track events (receiving remote media)
        this.peerConnection.ontrack = (event: RTCTrackEvent) => {
            if (event.streams && event.streams[0] && this.eventHandlers.onRemoteStream) {
                this.eventHandlers.onRemoteStream(event.streams[0]);
            }
        };
    }

    /**
     * Get local media stream using getUserMedia
     * Requests access to microphone and/or camera based on constraints
     * 
     * @param constraints - Media constraints for audio and video
     * @returns Promise resolving to MediaStream
     * @throws MediaPermissionError with user-friendly message
     */
    async getLocalStream(constraints: MediaConstraints): Promise<MediaStream> {
        try {
            // Request media access
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Store local stream
            this.localStream = stream;

            // Add tracks to peer connection if it exists
            if (this.peerConnection) {
                stream.getTracks().forEach(track => {
                    if (this.peerConnection && this.localStream) {
                        this.peerConnection.addTrack(track, this.localStream);
                    }
                });
            }

            return stream;
        } catch (error) {
            console.error('Error getting local stream:', error);

            // Handle specific media errors with user-friendly messages
            if (error instanceof Error) {
                let userMessage = 'Failed to access microphone/camera';

                switch (error.name) {
                    case 'NotAllowedError':
                        userMessage = 'Microphone/camera permission denied';
                        break;
                    case 'NotFoundError':
                        userMessage = 'No microphone or camera found';
                        break;
                    case 'NotReadableError':
                        userMessage = 'Device already in use';
                        break;
                    case 'OverconstrainedError':
                        userMessage = 'Camera/microphone does not meet requirements';
                        break;
                    case 'TypeError':
                        userMessage = 'Invalid media constraints';
                        break;
                    case 'AbortError':
                        userMessage = 'Media access was aborted';
                        break;
                    default:
                        userMessage = `Failed to access media: ${error.message}`;
                }

                // Create a new error with user-friendly message
                const mediaError = new Error(userMessage);
                mediaError.name = error.name;
                throw mediaError;
            }

            throw error;
        }
    }

    /**
     * Stop all tracks in the local media stream
     * Releases microphone and camera access
     */
    stopLocalStream(): void {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
            });
            this.localStream = null;
        }
    }

    /**
     * Close the peer connection and clean up resources
     * Stops all tracks and closes the connection
     */
    closePeerConnection(): void {
        if (this.peerConnection) {
            // Close the connection
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Stop local stream
        this.stopLocalStream();

        // Clear buffered ICE candidates
        this.clearPendingIceCandidates();
    }

    /**
     * Set event handlers for WebRTC events
     * 
     * @param handlers - Event handler callbacks
     */
    setEventHandlers(handlers: WebRTCEventHandlers): void {
        this.eventHandlers = handlers;
    }

    /**
     * Get the current peer connection
     * 
     * @returns RTCPeerConnection or null if not initialized
     */
    getPeerConnection(): RTCPeerConnection | null {
        return this.peerConnection;
    }

    /**
     * Get the current local stream
     * 
     * @returns MediaStream or null if not initialized
     */
    getLocalStreamInstance(): MediaStream | null {
        return this.localStream;
    }

    /**
     * Check if peer connection is initialized
     * 
     * @returns true if peer connection exists
     */
    hasPeerConnection(): boolean {
        return this.peerConnection !== null;
    }

    /**
     * Check if local stream is active
     * 
     * @returns true if local stream exists
     */
    hasLocalStream(): boolean {
        return this.localStream !== null;
    }

    /**
     * Create an SDP offer for initiating a call
     * Generates an offer that includes local media tracks
     * 
     * @returns Promise resolving to RTCSessionDescriptionInit
     * @throws Error if peer connection is not initialized
     */
    async createOffer(): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized. Call createPeerConnection() first.');
        }

        try {
            // Create the offer
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });

            // Set local description
            await this.peerConnection.setLocalDescription(offer);

            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw new Error(`Failed to create offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create an SDP answer in response to a received offer
     * Generates an answer that includes local media tracks
     * 
     * @param offer - The received SDP offer
     * @returns Promise resolving to RTCSessionDescriptionInit
     * @throws Error if peer connection is not initialized or offer is invalid
     */
    async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized. Call createPeerConnection() first.');
        }

        try {
            // Set the remote description (the offer)
            await this.setRemoteDescription(offer);

            // Create the answer
            const answer = await this.peerConnection.createAnswer();

            // Set local description
            await this.peerConnection.setLocalDescription(answer);

            return answer;
        } catch (error) {
            console.error('Error creating answer:', error);
            throw new Error(`Failed to create answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Set the remote session description
     * This can be either an offer (when answering) or an answer (when initiating)
     * After setting remote description, any buffered ICE candidates are added
     * 
     * @param description - The remote SDP description
     * @throws Error if peer connection is not initialized or description is invalid
     */
    async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized. Call createPeerConnection() first.');
        }

        try {
            // Set the remote description
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));

            // Process any buffered ICE candidates
            await this.processPendingIceCandidates();
        } catch (error) {
            console.error('Error setting remote description:', error);
            throw new Error(`Failed to set remote description: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Add an ICE candidate to the peer connection
     * If remote description is not set yet, the candidate is buffered
     * 
     * @param candidate - The ICE candidate to add
     * @throws Error if peer connection is not initialized or candidate is invalid
     */
    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('Peer connection not initialized. Call createPeerConnection() first.');
        }

        try {
            // Check if remote description is set
            if (!this.peerConnection.remoteDescription) {
                // Buffer the candidate until remote description is set
                console.log('Buffering ICE candidate until remote description is set');
                this.pendingIceCandidates.push(new RTCIceCandidate(candidate));
                return;
            }

            // Add the candidate immediately
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
            throw new Error(`Failed to add ICE candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process all buffered ICE candidates
     * Called after remote description is set
     * 
     * @private
     */
    private async processPendingIceCandidates(): Promise<void> {
        if (!this.peerConnection || this.pendingIceCandidates.length === 0) {
            return;
        }

        console.log(`Processing ${this.pendingIceCandidates.length} buffered ICE candidates`);

        // Add all buffered candidates
        const candidates = [...this.pendingIceCandidates];
        this.pendingIceCandidates = [];

        for (const candidate of candidates) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error adding buffered ICE candidate:', error);
                // Continue processing other candidates even if one fails
            }
        }
    }

    /**
     * Clear all buffered ICE candidates
     * Called when closing the connection
     * 
     * @private
     */
    private clearPendingIceCandidates(): void {
        this.pendingIceCandidates = [];
    }

    /**
     * Toggle mute state for audio track
     * Enables or disables the audio track in the local stream
     * 
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
     * 
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

    /**
     * Get the current connection state of the peer connection
     * 
     * @returns RTCPeerConnectionState or null if peer connection is not initialized
     */
    getConnectionState(): RTCPeerConnectionState | null {
        if (!this.peerConnection) {
            return null;
        }

        return this.peerConnection.connectionState;
    }

    /**
     * Get the current ICE connection state of the peer connection
     * 
     * @returns RTCIceConnectionState or null if peer connection is not initialized
     */
    getIceConnectionState(): RTCIceConnectionState | null {
        if (!this.peerConnection) {
            return null;
        }

        return this.peerConnection.iceConnectionState;
    }

    /**
     * Set callback for ICE candidate events
     * Called when a new ICE candidate is generated
     * 
     * @param callback - Function to call when ICE candidate is generated
     */
    onIceCandidate(callback: (candidate: RTCIceCandidate) => void): void {
        this.eventHandlers.onIceCandidate = callback;
    }

    /**
     * Set callback for connection state change events
     * Called when the peer connection state changes
     * 
     * @param callback - Function to call when connection state changes
     */
    onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
        this.eventHandlers.onConnectionStateChange = callback;
    }

    /**
     * Set callback for ICE connection state change events
     * Called when the ICE connection state changes
     * 
     * @param callback - Function to call when ICE connection state changes
     */
    onIceConnectionStateChange(callback: (state: RTCIceConnectionState) => void): void {
        this.eventHandlers.onIceConnectionStateChange = callback;
    }

    /**
     * Set callback for remote stream events
     * Called when a remote media stream is received
     * 
     * @param callback - Function to call when remote stream is received
     */
    onRemoteStream(callback: (stream: MediaStream) => void): void {
        this.eventHandlers.onRemoteStream = callback;
    }
}

/**
 * Singleton instance of WebRTC service
 * Use this instance throughout the application
 */
export const webrtcService = new WebRTCService();
