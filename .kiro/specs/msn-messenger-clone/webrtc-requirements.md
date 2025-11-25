# Requirements Document: P2P WebRTC Voice/Video Calls

## Introduction

This document outlines the requirements for adding peer-to-peer (P2P) voice and video calling capabilities to the MSN Messenger Clone application. The feature will enable one-on-one voice and video calls between users using WebRTC technology, with signaling handled through the existing Backend Service and Supabase infrastructure. The implementation will replicate the classic MSN Messenger calling experience with modern WebRTC technology.

## Glossary

- **WebRTC**: Web Real-Time Communication protocol enabling peer-to-peer audio, video, and data sharing between browsers
- **P2P Connection**: Peer-to-peer direct connection between two users without routing media through a server
- **Signaling**: The process of exchanging connection metadata (SDP offers/answers and ICE candidates) to establish a P2P connection
- **SDP**: Session Description Protocol, a format describing multimedia communication sessions
- **ICE Candidate**: Interactive Connectivity Establishment candidate, representing a potential network path for P2P connection
- **STUN Server**: Session Traversal Utilities for NAT server that helps discover public IP addresses for P2P connections
- **TURN Server**: Traversal Using Relays around NAT server that relays media when direct P2P connection fails
- **Call State**: The current status of a call (idle, ringing, active, ended)
- **Media Stream**: Audio and/or video data flowing between peers
- **RTCPeerConnection**: The WebRTC API object managing the P2P connection
- **Backend Service**: The Fastify server handling signaling and call state management
- **MSN Messenger Application**: The desktop application being developed
- **User**: A person who has registered and uses the MSN Messenger Application
- **Contact**: Another User that has been added to a User's contact list
- **Chat Session**: An active conversation between two Users
- **Presence Status**: The availability state of a User (Online, Away, Busy, Appear Offline)

## Requirements

### Requirement 1: Call Initiation

**User Story:** As a user, I want to initiate voice or video calls with my online contacts, so that I can have real-time conversations beyond text messaging.

#### Acceptance Criteria

1. WHEN a User opens a Chat Session with an online Contact, THE MSN Messenger Application SHALL display call initiation buttons for voice call and video call
2. WHEN a User clicks the voice call button, THE MSN Messenger Application SHALL send a call initiation request to the Backend Service with call type set to audio-only
3. WHEN a User clicks the video call button, THE MSN Messenger Application SHALL send a call initiation request to the Backend Service with call type set to audio-video
4. WHEN the Backend Service receives a call initiation request, THE Backend Service SHALL verify that both participants are online and create a call record in the database with status set to ringing
5. WHEN a call is initiated, THE MSN Messenger Application SHALL request permission to access the User's microphone for voice calls or microphone and camera for video calls

### Requirement 2: Call Notification and Ringing

**User Story:** As a user, I want to receive notifications when someone calls me, so that I can choose to answer or decline the call.

#### Acceptance Criteria

1. WHEN a call is initiated, THE MSN Messenger Application SHALL send a call notification to the recipient via Supabase Realtime within 1 second
2. WHEN a User receives a call notification, THE MSN Messenger Application SHALL open a ringing notification window displaying the caller's name and display picture
3. WHEN the ringing notification window is displayed, THE MSN Messenger Application SHALL play a ringing sound repeatedly until the call is answered or declined
4. THE MSN Messenger Application SHALL display answer and decline buttons in the ringing notification window
5. WHEN a call remains unanswered for 30 seconds, THE MSN Messenger Application SHALL automatically decline the call and update the call status to missed

### Requirement 3: WebRTC Signaling Exchange

**User Story:** As a developer, I want the application to exchange WebRTC signaling data reliably, so that P2P connections can be established successfully.

#### Acceptance Criteria

1. WHEN a User answers a call, THE MSN Messenger Application SHALL create an RTCPeerConnection and generate an SDP offer
2. WHEN an SDP offer is generated, THE MSN Messenger Application SHALL send the offer to the Backend Service which forwards it to the recipient via Supabase Realtime within 500 milliseconds
3. WHEN a User receives an SDP offer, THE MSN Messenger Application SHALL create an RTCPeerConnection, set the remote description, and generate an SDP answer
4. WHEN an SDP answer is generated, THE MSN Messenger Application SHALL send the answer to the Backend Service which forwards it to the caller via Supabase Realtime within 500 milliseconds
5. WHEN an RTCPeerConnection generates ICE candidates, THE MSN Messenger Application SHALL send each candidate to the Backend Service which forwards it to the peer via Supabase Realtime within 500 milliseconds

### Requirement 4: P2P Connection Establishment

**User Story:** As a user, I want the application to establish direct connections with my contacts, so that calls have low latency and high quality.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL configure RTCPeerConnection with at least two public STUN servers for NAT traversal
2. WHEN ICE candidates are received from the peer, THE MSN Messenger Application SHALL add them to the RTCPeerConnection within 100 milliseconds
3. WHEN the RTCPeerConnection state changes to connected, THE MSN Messenger Application SHALL update the call status to active and display the in-call UI
4. THE MSN Messenger Application SHALL attempt to establish a P2P connection using STUN servers without TURN relay
5. IF the P2P connection fails to establish within 10 seconds, THEN THE MSN Messenger Application SHALL display an error message and end the call

### Requirement 5: In-Call User Interface

**User Story:** As a user, I want intuitive controls during a call, so that I can manage audio, video, and end the call easily.

#### Acceptance Criteria

1. WHEN a call becomes active, THE MSN Messenger Application SHALL display an in-call overlay on the Chat Session window showing call duration
2. THE MSN Messenger Application SHALL display a mute button that toggles the User's microphone on and off
3. WHEN a User clicks the mute button, THE MSN Messenger Application SHALL disable the audio track in the local media stream within 100 milliseconds
4. WHERE the call type is audio-video, THE MSN Messenger Application SHALL display a camera toggle button that enables or disables the User's video
5. WHEN a User clicks the camera toggle button, THE MSN Messenger Application SHALL enable or disable the video track in the local media stream within 100 milliseconds
6. THE MSN Messenger Application SHALL display a hang-up button that terminates the call when clicked
7. WHERE the call type is audio-video, THE MSN Messenger Application SHALL display the remote video stream in a video element sized at least 320x240 pixels
8. WHERE the call type is audio-video, THE MSN Messenger Application SHALL display the local video stream in a picture-in-picture overlay sized at least 160x120 pixels

### Requirement 6: Call Termination

**User Story:** As a user, I want to end calls cleanly, so that resources are released and both parties are notified.

#### Acceptance Criteria

1. WHEN a User clicks the hang-up button, THE MSN Messenger Application SHALL close the RTCPeerConnection and stop all media tracks within 500 milliseconds
2. WHEN a User ends a call, THE MSN Messenger Application SHALL send a call termination message to the Backend Service which updates the call status to ended
3. WHEN a call is ended, THE Backend Service SHALL notify the other participant via Supabase Realtime within 1 second
4. WHEN a User receives a call termination notification, THE MSN Messenger Application SHALL close the RTCPeerConnection, stop all media tracks, and close the in-call UI
5. WHEN a call ends, THE MSN Messenger Application SHALL release microphone and camera permissions

### Requirement 7: Call State Management

**User Story:** As a user, I want the application to track call history, so that I can see when calls occurred and their duration.

#### Acceptance Criteria

1. WHEN a call is initiated, THE Backend Service SHALL create a record in the calls table with status set to ringing and store the conversation ID and initiator ID
2. WHEN a call becomes active, THE Backend Service SHALL update the call record with status set to active and record the started_at timestamp
3. WHEN a call ends, THE Backend Service SHALL update the call record with status set to ended and record the ended_at timestamp
4. THE Backend Service SHALL create call_participants records for both participants with joined_at timestamps when the call becomes active
5. WHEN a participant leaves a call, THE Backend Service SHALL update the call_participants record with a left_at timestamp

### Requirement 8: Call History Display

**User Story:** As a user, I want to see call history in my conversations, so that I can track when I communicated with contacts.

#### Acceptance Criteria

1. WHEN a call ends, THE Backend Service SHALL create a system message in the conversation indicating the call occurred with call duration
2. THE MSN Messenger Application SHALL read call history from the messages table and display call system messages in the Chat Session window
3. THE MSN Messenger Application SHALL display call system messages with a distinctive icon indicating voice or video call type
4. THE MSN Messenger Application SHALL display call duration in minutes and seconds format for completed calls
5. THE MSN Messenger Application SHALL display call status (missed, declined, completed) for each call in the history

### Requirement 9: Presence-Based Call Availability

**User Story:** As a user, I want to only initiate calls with online contacts, so that I don't attempt calls that cannot be answered.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL disable call initiation buttons when the Contact's Presence Status is not online
2. WHEN a User attempts to initiate a call with an offline Contact, THE MSN Messenger Application SHALL display an error message indicating the Contact is unavailable
3. THE Backend Service SHALL verify both participants have online Presence Status before creating a call record
4. IF a participant's Presence Status changes to offline during a ringing call, THEN THE Backend Service SHALL automatically decline the call and notify both participants
5. IF a participant's Presence Status changes to offline during an active call, THEN THE MSN Messenger Application SHALL end the call and notify the other participant

### Requirement 10: Audio and Video Quality Management

**User Story:** As a user, I want clear audio and video during calls, so that I can communicate effectively.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL request audio with echo cancellation enabled and noise suppression enabled
2. THE MSN Messenger Application SHALL request video at a resolution of at least 640x480 pixels at 15 frames per second
3. THE MSN Messenger Application SHALL configure RTCPeerConnection with adaptive bitrate enabled for network condition changes
4. THE MSN Messenger Application SHALL play remote audio through the default audio output device
5. THE MSN Messenger Application SHALL display connection quality indicators showing network status during active calls

### Requirement 11: Error Handling and Recovery

**User Story:** As a user, I want clear feedback when call issues occur, so that I understand what went wrong and can retry if needed.

#### Acceptance Criteria

1. IF media device access is denied, THEN THE MSN Messenger Application SHALL display an error message explaining that microphone or camera permission is required
2. IF the P2P connection fails to establish, THEN THE MSN Messenger Application SHALL display an error message indicating connection failure and end the call
3. IF the P2P connection drops during an active call, THEN THE MSN Messenger Application SHALL attempt to reconnect for up to 5 seconds
4. IF reconnection fails, THEN THE MSN Messenger Application SHALL end the call and display a disconnection message
5. WHEN a call error occurs, THE Backend Service SHALL update the call status to failed and record the error reason

### Requirement 12: Call Decline Handling

**User Story:** As a user, I want to decline incoming calls, so that I can control when I participate in voice or video conversations.

#### Acceptance Criteria

1. WHEN a User clicks the decline button in the ringing notification window, THE MSN Messenger Application SHALL send a call decline message to the Backend Service
2. WHEN the Backend Service receives a call decline message, THE Backend Service SHALL update the call status to declined within 500 milliseconds
3. WHEN a call is declined, THE Backend Service SHALL notify the caller via Supabase Realtime within 1 second
4. WHEN a User receives a call decline notification, THE MSN Messenger Application SHALL stop the ringing sound and close the call initiation UI
5. WHEN a call is declined, THE Backend Service SHALL create a system message in the conversation indicating the call was declined

### Requirement 13: Simultaneous Call Prevention

**User Story:** As a user, I want to avoid receiving multiple calls simultaneously, so that I can focus on one conversation at a time.

#### Acceptance Criteria

1. THE Backend Service SHALL check if a User has an active or ringing call before creating a new call record
2. IF a User has an active or ringing call, THEN THE Backend Service SHALL reject new call initiation requests with a busy status
3. WHEN a call initiation is rejected due to busy status, THE MSN Messenger Application SHALL display a message indicating the Contact is currently on another call
4. THE MSN Messenger Application SHALL disable call initiation buttons when the User has an active or ringing call
5. WHEN a User's active call ends, THE MSN Messenger Application SHALL re-enable call initiation buttons within 1 second

### Requirement 14: WebRTC Service Architecture

**User Story:** As a developer, I want a clean service layer for WebRTC functionality, so that the code is maintainable and testable.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL implement a webrtc-service module that encapsulates all RTCPeerConnection management
2. THE webrtc-service SHALL provide methods for initiating calls, answering calls, and ending calls
3. THE webrtc-service SHALL handle ICE candidate gathering and exchange internally
4. THE webrtc-service SHALL emit events for connection state changes, media stream updates, and errors
5. THE MSN Messenger Application SHALL use React Query hooks to interact with the Backend Service for call signaling operations

### Requirement 15: Database Schema for Calls

**User Story:** As a developer, I want proper database schema for call tracking, so that call history and state are persisted reliably.

#### Acceptance Criteria

1. THE Backend Service SHALL create a calls table with columns for id, conversation_id, initiator_id, call_type, status, started_at, and ended_at
2. THE Backend Service SHALL create a call_participants table with columns for id, call_id, user_id, joined_at, and left_at
3. THE calls table SHALL have a foreign key constraint on conversation_id referencing the conversations table
4. THE call_participants table SHALL have a foreign key constraint on call_id referencing the calls table
5. THE Backend Service SHALL create indexes on calls.conversation_id and call_participants.call_id for query performance
