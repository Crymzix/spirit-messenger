# Implementation Plan: P2P WebRTC Voice/Video Calls

This implementation plan breaks down the WebRTC calling feature into discrete, actionable coding tasks. Each task builds incrementally on previous work, ensuring the feature is integrated step-by-step into the existing MSN Messenger Clone application.

## Task List

- [x] 1. Database schema and migrations for calls
  - Modify Drizzle schema to add table with columns: id, conversation_id, initiator_id, call_type, status, started_at, ended_at, error_reason, created_at, updated_at
  - Modify Drizzle schema to add call_participants table with columns: id, call_id, user_id, joined_at, left_at, created_at
  - Add indexes on calls(conversation_id, created_at), calls(status), call_participants(call_id), call_participants(user_id) in the Drizzle schema
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 2. Backend: Call service layer
  - Create backend/src/services/call-service.ts with CallService class
  - Implement initiateCall method that verifies users are online, checks for existing calls, creates call record, and returns Call object
  - Implement answerCall method that updates call status to active, records started_at timestamp, creates call_participants records
  - Implement declineCall method that updates call status to declined and creates system message
  - Implement endCall method that updates call status to ended, records ended_at, updates call_participants with left_at, calculates duration
  - Implement getActiveCall method that queries for active or ringing calls in a conversation
  - Implement handleSignal method that validates participants and forwards signaling data
  - _Requirements: 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. Backend: Realtime event publishing
  - Create backend/src/lib/realtime-publisher.ts with RealtimePublisher class
  - Implement publishCallRinging method that sends call_ringing event to recipient via Supabase Realtime
  - Implement publishCallAnswered method that sends call_answered event to both participants
  - Implement publishCallDeclined method that sends call_declined event to caller
  - Implement publishCallEnded method that sends call_ended event to both participants
  - Implement publishSignal method that forwards SDP offers/answers and ICE candidates to recipient
  - _Requirements: 2.1, 3.2, 3.4, 3.5_

- [x] 4. Backend: Call API routes
  - Create backend/src/routes/calls.ts with Fastify route handlers
  - Implement POST /api/calls/initiate endpoint that accepts conversation_id and call_type, calls CallService.initiateCall
  - Implement POST /api/calls/:callId/answer endpoint that calls CallService.answerCall
  - Implement POST /api/calls/:callId/decline endpoint that calls CallService.declineCall
  - Implement POST /api/calls/:callId/end endpoint that calls CallService.endCall
  - Implement POST /api/calls/:callId/signal endpoint that accepts signaling data and calls CallService.handleSignal
  - Implement GET /api/calls/active/:conversationId endpoint that calls CallService.getActiveCall
  - Add authentication middleware to all call endpoints
  - Register call routes in backend/src/index.ts
  - _Requirements: 1.2, 1.3, 2.4, 6.2, 12.1, 12.2_

- [x] 5. Frontend: Call service API client
  - Create messenger/src/lib/services/call-service.ts with call API client functions
  - Implement initiateCall function that sends POST request to /api/calls/initiate
  - Implement answerCall function that sends POST request to /api/calls/:callId/answer
  - Implement declineCall function that sends POST request to /api/calls/:callId/decline
  - Implement endCall function that sends POST request to /api/calls/:callId/end
  - Implement sendSignal function that sends POST request to /api/calls/:callId/signal
  - Implement getActiveCall function that sends GET request to /api/calls/active/:conversationId
  - _Requirements: 14.5_

- [x] 6. Frontend: React Query hooks for calls
  - Create messenger/src/lib/hooks/call-hooks.ts with React Query hooks
  - Implement useCallInitiate hook using useMutation that wraps callService.initiateCall
  - Implement useCallAnswer hook using useMutation that wraps callService.answerCall
  - Implement useCallDecline hook using useMutation that wraps callService.declineCall
  - Implement useCallEnd hook using useMutation that wraps callService.endCall
  - Implement useCallSignal hook using useMutation that wraps callService.sendSignal
  - Implement useActiveCall hook using useQuery that wraps callService.getActiveCall
  - Add query invalidation logic to keep call state synchronized
  - _Requirements: 14.5_

- [x] 7. Frontend: Zustand store for call state
  - Create messenger/src/lib/store/call-store.ts with Zustand store
  - Define CallState interface with fields: activeCall, callState, localStream, remoteStream, isMuted, isCameraOff, connectionState, iceConnectionState
  - Implement setActiveCall, setCallState, setLocalStream, setRemoteStream actions
  - Implement toggleMute action that modifies audio track enabled state
  - Implement toggleCamera action that modifies video track enabled state
  - Implement setConnectionState action for RTCPeerConnection state
  - Implement reset action that clears all call state
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 8. Frontend: WebRTC service core
  - Create messenger/src/lib/services/webrtc-service.ts with WebRTCService class
  - Implement createPeerConnection method that creates RTCPeerConnection with STUN server configuration
  - Implement getLocalStream method that calls getUserMedia with audio/video constraints
  - Implement stopLocalStream method that stops all media tracks
  - Implement closePeerConnection method that closes RTCPeerConnection and cleans up resources
  - Configure RTCPeerConnection with Google and Mozilla STUN servers
  - Add event listeners for icecandidate, connectionstatechange, iceconnectionstatechange, track events
  - _Requirements: 1.5, 4.1, 6.1, 6.5, 14.1, 14.2_

- [x] 9. Frontend: WebRTC signaling methods
  - Add createOffer method to WebRTCService that generates SDP offer
  - Add createAnswer method to WebRTCService that generates SDP answer from received offer
  - Add setRemoteDescription method to WebRTCService that sets remote SDP
  - Add addIceCandidate method to WebRTCService that adds ICE candidate to peer connection
  - Implement ICE candidate buffering before remote description is set
  - Add error handling for signaling failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 14.3_

- [x] 10. Frontend: WebRTC media controls
  - Add toggleMute method to WebRTCService that enables/disables audio track
  - Add toggleCamera method to WebRTCService that enables/disables video track
  - Add getConnectionState method that returns current RTCPeerConnectionState
  - Add event emitter methods: onIceCandidate, onConnectionStateChange, onRemoteStream
  - Integrate with call-store to update UI state when media controls change
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 14.4_

- [x] 11. Frontend: Supabase Realtime call event subscriptions
  - Create messenger/src/lib/services/call-realtime-service.ts for Realtime subscriptions
  - Implement subscribeToCallEvents method that subscribes to call_ringing, call_answered, call_declined, call_ended events
  - Implement subscribeToSignaling method that subscribes to sdp_offer, sdp_answer, ice_candidate events for active call
  - Add event handlers that update call-store state and trigger WebRTC actions
  - Implement unsubscribe cleanup methods
  - _Requirements: 2.1, 2.3, 6.3_

- [x] 12. Frontend: Call initiation buttons in chat window
  - Implement onClick handlers that call useCallInitiate hook with appropriate call_type
  - Integrate handlers on to aleady implemented Voice and Webcam buttons in the chat-window.tsx
  - Disable buttons when contact is offline or user has active call
  - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.2, 13.4_

- [x] 13. Frontend: Ringing notification window
  - Create messenger/src/components/windows/ringing-window.tsx component
  - Display caller's display picture, name, and call type (voice/video)
  - Add Answer and Decline buttons
  - Implement ringing sound playback using Audio API with loop enabled
  - Stop ringing sound when component unmounts
  - Implement onClick handler for Answer button that calls useCallAnswer hook
  - Implement onClick handler for Decline button that calls useCallDecline hook
  - _Requirements: 2.2, 2.3, 2.4, 12.3, 12.4_

- [x] 14. Frontend: Call initiation flow
  - Implement call initiation logic in chat window when call buttons are clicked
  - Call useCallInitiate mutation with conversationId and callType
  - Update call-store with activeCall and set callState to 'initiating'
  - Subscribe to call_answered event via Realtime
  - When call_answered received, set callState to 'connecting'
  - Request media permissions using webrtc-service.getLocalStream
  - Create peer connection and generate SDP offer
  - Send SDP offer via useCallSignal hook
  - Handle media permission errors and display error messages
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1_

- [x] 15. Frontend: Call answering flow
  - Implement call answering logic when Answer button clicked in ringing window
  - Call useCallAnswer mutation with callId
  - Update call-store with activeCall and set callState to 'connecting'
  - Request media permissions using webrtc-service.getLocalStream
  - Create peer connection
  - Subscribe to sdp_offer event via Realtime
  - When sdp_offer received, set remote description and generate SDP answer
  - Send SDP answer via useCallSignal hook
  - Handle media permission errors and display error messages
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 11.1_

- [x] 16. Frontend: ICE candidate exchange
  - Implement ICE candidate event handler in webrtc-service
  - When onicecandidate fires, send candidate via useCallSignal hook
  - Subscribe to ice_candidate events via Realtime
  - When ice_candidate received, add to peer connection using addIceCandidate
  - Buffer ICE candidates if remote description not yet set
  - Handle ICE gathering completion
  - _Requirements: 3.5, 4.2_

- [x] 17. Frontend: P2P connection establishment
  - Monitor connectionState changes in webrtc-service
  - When connectionState becomes 'connected', update call-store callState to 'active'
  - When connectionState becomes 'failed', display error and end call
  - When connectionState becomes 'disconnected', attempt reconnection for 5 seconds
  - If reconnection fails, display error and end call
  - Handle remote media stream when ontrack event fires
  - Update call-store with remoteStream
  - _Requirements: 4.3, 4.4, 4.5, 11.2, 11.3, 11.4_

- [x] 18. Frontend: In-call UI overlay for audio calls
  - Create messenger/src/components/audio-call-overlay.tsx component
  - Display call duration timer that updates every second
  - Display contact name and display picture
  - Add CallControls component with mute and hang-up buttons
  - Display connection quality indicator
  - Position overlay within chat window
  - Style to match MSN Messenger in-call UI
  - _Requirements: 5.1, 5.6, 10.5_

- [x] 19. Frontend: In-call UI overlay for video calls
  - Create messenger/src/components/video-call-overlay.tsx component
  - Add video element for remote stream with autoplay and playsInline
  - Add video element for local stream in picture-in-picture position with muted attribute
  - Display call duration timer
  - Add CallControls component with mute, camera toggle, and hang-up buttons
  - Implement useEffect hooks to set video element srcObject when streams change
  - Style video elements and overlay to match MSN Messenger aesthetic
  - _Requirements: 5.1, 5.7, 5.8, 10.1, 10.2_

- [x] 20. Frontend: Call controls component
  - Create messenger/src/components/call-controls.tsx component
  - Add mute button that calls call-store toggleMute action
  - Add camera toggle button (for video calls) that calls call-store toggleCamera action
  - Add hang-up button that calls useCallEnd hook
  - Display appropriate icons based on muted/camera state
  - Style buttons to match MSN Messenger call controls
  - Add hover effects and tooltips
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 21. Frontend: Call termination flow
  - Implement hang-up button onClick handler that calls useCallEnd mutation
  - Call webrtc-service.closePeerConnection to close RTCPeerConnection
  - Call webrtc-service.stopLocalStream to stop media tracks
  - Update call-store callState to 'ended'
  - Clear call-store with reset action
  - Close in-call UI overlay
  - Subscribe to call_ended event via Realtime for remote hang-up
  - Handle remote hang-up by closing connection and updating UI
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 22. Frontend: Call decline flow
  - Implement Decline button onClick handler in ringing window
  - Call useCallDecline mutation with callId
  - Close ringing window
  - Stop ringing sound
  - Subscribe to call_declined event via Realtime for caller
  - When call_declined received, display "Call declined" message and close call UI
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 23. Backend: Call history system messages
  - Update CallService.endCall to create system message in messages table
  - Calculate call duration from started_at and ended_at timestamps
  - Format system message content as "[Call Type] call - [Duration]"
  - Set message_type to 'system' and include call metadata (call_id, call_type, duration_seconds, status)
  - Update CallService.declineCall to create system message indicating call was declined
  - Update CallService for missed calls (timeout) to create system message
  - _Requirements: 8.1, 8.2, 8.5, 12.5_

- [x] 24. Frontend: Call history display in chat
  - Update messenger/src/components/message-content.tsx to handle system message type 'call'
  - Display call icon (phone or video) based on call_type in metadata
  - Display call duration for completed calls
  - Display call status (missed, declined, completed) with appropriate styling
  - Add timestamp display for call messages
  - Style call history messages to match MSN Messenger system messages
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 25. Frontend: Presence-based call availability
  - Check contact presence status before enabling call buttons
  - Disable call buttons when contact presence is not 'online'
  - Display tooltip "Contact is offline" when buttons are disabled
  - Subscribe to presence changes and update button state dynamically
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 26. Backend: Presence-based call validation
  - Update CallService.initiateCall to verify both users have 'online' presence status
  - Return error if either user is offline
  - Subscribe to presence changes during ringing state
  - Auto-decline call if initiator or recipient goes offline while ringing
  - Auto-end call if either participant goes offline during active call
  - _Requirements: 9.3, 9.4, 9.5_

- [ ] 27. Frontend: Audio quality configuration
  - Configure getUserMedia audio constraints with echoCancellation: true
  - Set noiseSuppression: true in audio constraints
  - Set autoGainControl: true in audio constraints
  - Configure RTCPeerConnection with adaptive bitrate enabled
  - _Requirements: 10.1, 10.3_

- [ ] 28. Frontend: Video quality configuration
  - Configure getUserMedia video constraints with width: 640, height: 480
  - Set frameRate: 15 in video constraints
  - Configure RTCPeerConnection video codec preferences
  - Add connection quality monitoring based on RTCStatsReport
  - Display connection quality indicator in UI
  - _Requirements: 10.2, 10.5_

- [x] 29. Frontend: Error handling for media permissions
  - Wrap getUserMedia calls in try-catch blocks
  - Handle NotAllowedError with message "Microphone/camera permission denied"
  - Handle NotFoundError with message "No microphone or camera found"
  - Handle NotReadableError with message "Device already in use"
  - Display error messages in modal dialog
  - End call when media permission errors occur
  - _Requirements: 11.1_

- [x] 30. Frontend: Error handling for connection failures
  - Monitor RTCPeerConnectionState for 'failed' state
  - Display error message "Connection failed. Please check your network."
  - Implement 5-second reconnection attempt for 'disconnected' state
  - End call if reconnection fails
  - Display disconnection message to user
  - _Requirements: 11.2, 11.3, 11.4_

- [x] 31. Backend: Error handling and call failure tracking
  - Update CallService to catch and log errors during call operations
  - Set call status to 'failed' when errors occur
  - Record error_reason in calls table
  - Return appropriate HTTP error codes (400, 404, 500)
  - Publish call_failed event via Realtime
  - _Requirements: 11.5_

- [x] 32. Backend: Simultaneous call prevention
  - Update CallService.initiateCall to check for existing active or ringing calls for both users
  - Return 409 Conflict status if either user has active call
  - Include error message "User is currently on another call"
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 33. Frontend: Simultaneous call prevention UI
  - Disable call buttons when user has active or ringing call
  - Display error message when call initiation fails due to busy status
  - Show "Contact is on another call" message when appropriate
  - Re-enable buttons when active call ends
  - _Requirements: 13.3, 13.4, 13.5_

- [x] 34. Frontend: Auto-decline missed calls
  - Implement 30-second timeout when ringing window is displayed
  - Call useCallDecline mutation automatically after timeout
  - Update call status to 'missed' instead of 'declined'
  - Close ringing window and stop ringing sound
  - _Requirements: 2.5_

- [ ] 35. Backend: Missed call handling
  - Add 'missed' status to call status enum
  - Update CallService to handle missed call status
  - Create system message for missed calls
  - Publish call_missed event via Realtime
  - _Requirements: 2.5, 8.5_

- [ ] 36. Integration: Wire call UI into chat window
  - Import CallInitiationButtons component into chat-window.tsx
  - Add CallInitiationButtons to chat window toolbar
  - Conditionally render AudioCallOverlay or VideoCallOverlay based on active call
  - Subscribe to call events in chat window component
  - Show/hide ringing window based on incoming call events
  - Pass conversation and contact data to call components
  - _Requirements: 1.1, 5.1_

- [ ] 37. Integration: Global call state management
  - Ensure only one active call allowed across all chat windows
  - Synchronize call state across components using call-store
  - Handle window focus changes during active calls
  - Persist call state during window navigation
  - Clean up call state on application close
  - _Requirements: 13.1, 13.4_

- [ ]* 38. Testing: WebRTC service unit tests
  - Write tests for createPeerConnection with STUN configuration
  - Write tests for getLocalStream with audio/video constraints
  - Write tests for SDP offer/answer generation
  - Write tests for ICE candidate handling
  - Write tests for media track enable/disable
  - Mock RTCPeerConnection and getUserMedia APIs
  - _Requirements: 14.1, 14.2, 14.3_

- [ ]* 39. Testing: Call flow integration tests
  - Write test for complete call initiation to answer flow
  - Write test for call decline flow
  - Write test for call end flow
  - Write test for ICE candidate exchange
  - Write test for connection failure scenarios
  - Mock Supabase Realtime and Backend Service API
  - _Requirements: 1.1, 1.2, 1.3, 2.4, 6.2, 12.1_

- [ ]* 40. Testing: Error scenario tests
  - Write test for media permission denied error
  - Write test for connection failure error
  - Write test for offline contact call attempt
  - Write test for simultaneous call prevention
  - Write test for missed call timeout
  - Verify error messages displayed correctly
  - _Requirements: 11.1, 11.2, 11.3, 13.1, 2.5_

## Notes

- All tasks build incrementally on the existing MSN Messenger Clone codebase
- Backend tasks (2-4, 23, 26, 31-32, 35) should be completed before corresponding frontend tasks
- Database migration (task 1) must be completed first
- WebRTC service core (tasks 8-10) should be completed before call flow tasks (14-17)
- UI components (tasks 18-20) can be developed in parallel with call flow logic
- Integration tasks (36-37) should be completed after all individual components are working
- Optional testing tasks (38-40) marked with * can be skipped for faster MVP delivery
