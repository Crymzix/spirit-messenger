# WebRTC Service Media Controls - Usage Example

This document demonstrates how to use the media control methods added to the WebRTC service.

## Overview

The WebRTC service now includes the following media control methods:

1. `toggleMute(muted: boolean)` - Enable/disable audio track
2. `toggleCamera(cameraOff: boolean)` - Enable/disable video track
3. `getConnectionState()` - Get current RTCPeerConnectionState
4. `getIceConnectionState()` - Get current RTCIceConnectionState
5. Event emitter methods:
   - `onIceCandidate(callback)`
   - `onConnectionStateChange(callback)`
   - `onIceConnectionStateChange(callback)`
   - `onRemoteStream(callback)`

## Integration with Call Store

The call store has been updated to use the WebRTC service for media controls:

```typescript
import { useCallStore } from '@/lib/store/call-store';

// In a component
const { toggleMute, toggleCamera, isMuted, isCameraOff } = useCallStore();

// Toggle mute
toggleMute(); // Calls webrtcService.toggleMute() internally

// Toggle camera
toggleCamera(); // Calls webrtcService.toggleCamera() internally
```

## Usage Examples

### 1. Setting Up Event Handlers

```typescript
import { webrtcService } from '@/lib/services/webrtc-service';
import { useCallStore } from '@/lib/store/call-store';

// Set up event handlers before creating peer connection
webrtcService.onIceCandidate((candidate) => {
  console.log('New ICE candidate:', candidate);
  // Send candidate to remote peer via signaling
  sendSignal({ type: 'ice_candidate', candidate });
});

webrtcService.onConnectionStateChange((state) => {
  console.log('Connection state changed:', state);
  // Update UI based on connection state
  useCallStore.getState().setConnectionState(state);
  
  if (state === 'connected') {
    console.log('Call connected successfully!');
  } else if (state === 'failed') {
    console.error('Connection failed');
  }
});

webrtcService.onIceConnectionStateChange((state) => {
  console.log('ICE connection state changed:', state);
  useCallStore.getState().setIceConnectionState(state);
});

webrtcService.onRemoteStream((stream) => {
  console.log('Received remote stream:', stream);
  // Update call store with remote stream
  useCallStore.getState().setRemoteStream(stream);
});
```

### 2. Toggling Mute During a Call

```typescript
import { webrtcService } from '@/lib/services/webrtc-service';

// Mute audio
const success = webrtcService.toggleMute(true);
if (success) {
  console.log('Audio muted');
} else {
  console.error('Failed to mute audio - no local stream');
}

// Unmute audio
const success = webrtcService.toggleMute(false);
if (success) {
  console.log('Audio unmuted');
}
```

### 3. Toggling Camera During a Video Call

```typescript
import { webrtcService } from '@/lib/services/webrtc-service';

// Turn camera off
const success = webrtcService.toggleCamera(true);
if (success) {
  console.log('Camera disabled');
} else {
  console.error('Failed to disable camera - no local stream');
}

// Turn camera on
const success = webrtcService.toggleCamera(false);
if (success) {
  console.log('Camera enabled');
}
```

### 4. Checking Connection State

```typescript
import { webrtcService } from '@/lib/services/webrtc-service';

// Get current connection state
const connectionState = webrtcService.getConnectionState();

if (connectionState === null) {
  console.log('No peer connection established');
} else if (connectionState === 'connected') {
  console.log('Call is connected');
} else if (connectionState === 'failed') {
  console.log('Connection failed');
}

// Get ICE connection state
const iceState = webrtcService.getIceConnectionState();
console.log('ICE connection state:', iceState);
```

### 5. Complete Call Flow with Media Controls

```typescript
import { webrtcService } from '@/lib/services/webrtc-service';
import { useCallStore } from '@/lib/store/call-store';

async function initiateCall(isVideoCall: boolean) {
  // 1. Set up event handlers
  webrtcService.onIceCandidate((candidate) => {
    sendSignalToRemote({ type: 'ice_candidate', candidate });
  });

  webrtcService.onConnectionStateChange((state) => {
    useCallStore.getState().setConnectionState(state);
    if (state === 'connected') {
      useCallStore.getState().setCallState('active');
    }
  });

  webrtcService.onRemoteStream((stream) => {
    useCallStore.getState().setRemoteStream(stream);
  });

  // 2. Create peer connection
  webrtcService.createPeerConnection();

  // 3. Get local media stream
  const stream = await webrtcService.getLocalStream({
    audio: true,
    video: isVideoCall,
  });
  useCallStore.getState().setLocalStream(stream);

  // 4. Create and send offer
  const offer = await webrtcService.createOffer();
  await sendSignalToRemote({ type: 'offer', sdp: offer });

  // 5. Media controls are now available
  // User can toggle mute/camera during the call
}

// In a call control component
function CallControls() {
  const { toggleMute, toggleCamera, isMuted, isCameraOff } = useCallStore();

  return (
    <div>
      <button onClick={toggleMute}>
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <button onClick={toggleCamera}>
        {isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
      </button>
    </div>
  );
}
```

## Return Values

### toggleMute(muted: boolean): boolean
- Returns `true` if the operation succeeded
- Returns `false` if there's no local stream or no audio tracks

### toggleCamera(cameraOff: boolean): boolean
- Returns `true` if the operation succeeded
- Returns `false` if there's no local stream or no video tracks

### getConnectionState(): RTCPeerConnectionState | null
- Returns the current connection state: 'new', 'connecting', 'connected', 'disconnected', 'failed', or 'closed'
- Returns `null` if no peer connection exists

### getIceConnectionState(): RTCIceConnectionState | null
- Returns the current ICE connection state: 'new', 'checking', 'connected', 'completed', 'failed', 'disconnected', or 'closed'
- Returns `null` if no peer connection exists

## Notes

- Always set up event handlers before creating the peer connection
- The call store automatically integrates with the WebRTC service for media controls
- Media controls only work when a local stream exists (after calling `getLocalStream()`)
- Connection state changes are automatically propagated to the call store when using the event handlers
