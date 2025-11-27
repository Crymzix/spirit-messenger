# Call Answering Flow Implementation

## Overview

This document describes the implementation of the call answering flow for WebRTC voice and video calls in the MSN Messenger Clone application.

## Implementation Details

### Location
- **File**: `messenger/src/components/windows/ringing-window.tsx`
- **Function**: `handleAnswer()`

### Flow Steps

The call answering flow follows these steps when a user clicks the "Answer" button:

#### 1. Answer Call via Backend API
```typescript
const call = await answerMutation.mutateAsync(callId);
```
- Sends POST request to `/api/calls/:callId/answer`
- Updates call status to 'active' in database
- Returns the updated Call object

#### 2. Update Call Store
```typescript
callStore.setActiveCall(call);
callStore.setCallState('connecting');
```
- Stores the active call in global state
- Sets call state to 'connecting' to show connection UI

#### 3. Request Media Permissions
```typescript
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

const localStream = await webrtcService.getLocalStream(constraints);
callStore.setLocalStream(localStream);
```
- Requests microphone access (always)
- Requests camera access (only for video calls)
- Applies audio quality settings (echo cancellation, noise suppression, auto gain)
- Applies video quality settings (640x480 @ 15fps)
- Stores local stream in call store

#### 4. Handle Media Permission Errors
```typescript
catch (mediaError: any) {
    let errorMessage = 'Failed to access microphone/camera';
    if (mediaError.name === 'NotAllowedError') {
        errorMessage = 'Microphone/camera permission denied...';
    } else if (mediaError.name === 'NotFoundError') {
        errorMessage = 'No microphone or camera found...';
    } else if (mediaError.name === 'NotReadableError') {
        errorMessage = 'Device already in use...';
    }
    
    setError(errorMessage);
    await declineMutation.mutateAsync(callId);
    callStore.reset();
}
```
- Catches specific media errors
- Shows user-friendly error messages
- Automatically declines the call if media access fails
- Closes window after 3 seconds

#### 5. Create Peer Connection
```typescript
webrtcService.createPeerConnection();
```
- Creates RTCPeerConnection with STUN server configuration
- Sets up event listeners for ICE candidates, connection state, and remote tracks

#### 6. Set Up WebRTC Event Handlers
```typescript
webrtcService.setEventHandlers({
    onIceCandidate: (candidate) => {
        signalMutation.mutate({
            callId,
            signalType: 'ice-candidate',
            signalData: candidate.toJSON(),
            targetUserId: callerId,
        });
    },
    onConnectionStateChange: (state) => {
        callStore.setConnectionState(state);
        if (state === 'connected') {
            callStore.setCallState('active');
        }
    },
    onRemoteStream: (stream) => {
        callStore.setRemoteStream(stream);
    },
});
```
- Sends ICE candidates to peer via backend API
- Updates connection state in call store
- Transitions to 'active' state when connected
- Stores remote stream when received

#### 7. Subscribe to Signaling Events
```typescript
await callRealtimeService.subscribeToSignaling(callId, {
    onSdpOffer: async (offer, fromUserId) => {
        const answer = await webrtcService.createAnswer(offer);
        await signalMutation.mutateAsync({
            callId,
            signalType: 'answer',
            signalData: answer,
            targetUserId: callerId,
        });
    },
    onIceCandidate: async (_candidate, fromUserId) => {
        // Automatically handled by callRealtimeService
    },
});
```
- Subscribes to Supabase Realtime channel for signaling
- Waits for SDP offer from caller
- Creates SDP answer when offer is received
- Sends answer back to caller via backend API
- Receives and processes ICE candidates automatically

#### 8. Close Ringing Window
```typescript
const appWindow = getCurrentWindow();
appWindow.close();
```
- Closes the ringing notification window
- Call UI will be shown in the chat window

## Error Handling

### Media Permission Errors
- **NotAllowedError**: User denied permission
- **NotFoundError**: No device found
- **NotReadableError**: Device already in use

All errors result in:
1. User-friendly error message displayed
2. Call automatically declined
3. Window closes after 3 seconds

### Signaling Errors
- Logged to console
- Error message displayed to user
- Connection attempt continues (may fail gracefully)

## Requirements Validated

This implementation satisfies the following requirements:

- **2.4**: Answer call functionality
- **3.1**: SDP offer/answer exchange
- **3.2**: Set remote description
- **3.3**: Generate SDP answer
- **3.4**: Send SDP answer
- **11.1**: Media permission handling with error messages

## Integration Points

### Services Used
- `webrtcService`: WebRTC peer connection management
- `callRealtimeService`: Supabase Realtime signaling
- `callService`: Backend API calls (via React Query hooks)

### Hooks Used
- `useCallAnswer`: Answer call mutation
- `useCallDecline`: Decline call mutation (for error cases)
- `useCallSignal`: Send signaling data mutation

### Store Used
- `useCallStore`: Global call state management

## Testing Considerations

To test this flow:

1. **Happy Path**: User answers call with working microphone/camera
2. **Permission Denied**: User denies media permissions
3. **No Device**: No microphone/camera connected
4. **Device In Use**: Microphone/camera already in use by another app
5. **Network Issues**: Signaling fails or connection times out
6. **Video vs Audio**: Test both call types

## Next Steps

After this implementation, the following tasks should be completed:

- Task 16: ICE candidate exchange (already partially implemented)
- Task 17: P2P connection establishment
- Task 18-19: In-call UI overlays
- Task 20: Call controls component
