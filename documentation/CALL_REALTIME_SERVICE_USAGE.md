# Call Realtime Service Usage Guide

This document provides examples of how to use the `CallRealtimeService` for managing WebRTC call events and signaling via Supabase Realtime.

## Overview

The `CallRealtimeService` manages two types of Supabase Realtime subscriptions:

1. **Call Events**: Notifications about call state changes (ringing, answered, declined, ended)
2. **Signaling Events**: WebRTC signaling data exchange (SDP offers/answers, ICE candidates)

## Basic Setup

```typescript
import { callRealtimeService } from '@/lib/services/call-realtime-service';
import { useAuthStore } from '@/lib/store/auth-store';

// Set the current user ID (required before subscribing)
const userId = useAuthStore.getState().user?.id;
if (userId) {
  callRealtimeService.setCurrentUserId(userId);
}
```

## Subscribing to Call Events

Subscribe to call events when the user signs in or when the main app loads:

```typescript
import { callRealtimeService } from '@/lib/services/call-realtime-service';

// Subscribe to call events with custom handlers
await callRealtimeService.subscribeToCallEvents({
  onCallRinging: (call, callerId) => {
    console.log('Incoming call from:', callerId);
    // Show ringing notification window
    // Play ringing sound
  },
  
  onCallAnswered: (call) => {
    console.log('Call answered:', call.id);
    // Start WebRTC connection setup
    // Begin signaling exchange
  },
  
  onCallDeclined: (call) => {
    console.log('Call declined:', call.id);
    // Show "Call declined" message
    // Clean up UI
  },
  
  onCallEnded: (call) => {
    console.log('Call ended:', call.id);
    // Close call UI
    // Clean up WebRTC connection
  },
  
  onCallFailed: (call) => {
    console.log('Call failed:', call.id);
    // Show error message
    // Clean up resources
  }
});
```

## Subscribing to Signaling Events

Subscribe to signaling events when a call is answered (for both caller and callee):

```typescript
import { callRealtimeService } from '@/lib/services/call-realtime-service';
import { webrtcService } from '@/lib/services/webrtc-service';
import { sendSignal } from '@/lib/services/call-service';

// Subscribe to signaling for an active call
await callRealtimeService.subscribeToSignaling(callId, {
  onSdpOffer: async (offer, fromUserId) => {
    console.log('Received SDP offer from:', fromUserId);
    
    // The service automatically sets the remote description
    // Now create and send an answer
    const answer = await webrtcService.createAnswer(offer);
    await sendSignal(callId, 'answer', answer, fromUserId);
  },
  
  onSdpAnswer: async (answer, fromUserId) => {
    console.log('Received SDP answer from:', fromUserId);
    
    // The service automatically sets the remote description
    // Connection establishment will proceed automatically
  },
  
  onIceCandidate: async (candidate, fromUserId) => {
    console.log('Received ICE candidate from:', fromUserId);
    
    // The service automatically adds the ICE candidate
    // No additional action needed
  }
});
```

## Complete Call Flow Example

### Caller Side (Initiating a Call)

```typescript
import { callRealtimeService } from '@/lib/services/call-realtime-service';
import { webrtcService } from '@/lib/services/webrtc-service';
import { initiateCall, sendSignal } from '@/lib/services/call-service';
import { useCallStore } from '@/lib/store/call-store';

async function startCall(conversationId: string, callType: 'voice' | 'video') {
  try {
    // 1. Initiate the call via backend
    const call = await initiateCall(conversationId, callType);
    
    // 2. Update local state
    useCallStore.getState().setActiveCall(call);
    useCallStore.getState().setCallState('initiating');
    
    // 3. Subscribe to signaling events
    await callRealtimeService.subscribeToSignaling(call.id, {
      onSdpAnswer: async (answer, fromUserId) => {
        // Answer received, connection will establish
        console.log('Received answer, establishing connection...');
      },
      
      onIceCandidate: async (candidate, fromUserId) => {
        // ICE candidates are automatically added by the service
      }
    });
    
    // 4. Wait for call_answered event (handled by call events subscription)
    // When answered, the onCallAnswered handler will trigger
    
  } catch (error) {
    console.error('Failed to start call:', error);
  }
}

// When call is answered (in onCallAnswered handler):
async function onCallAnswered(call: Call) {
  try {
    // 1. Get local media stream
    const constraints = {
      audio: true,
      video: call.callType === 'video'
    };
    const localStream = await webrtcService.getLocalStream(constraints);
    useCallStore.getState().setLocalStream(localStream);
    
    // 2. Create peer connection
    webrtcService.createPeerConnection();
    
    // 3. Set up WebRTC event handlers
    webrtcService.onIceCandidate(async (candidate) => {
      // Send ICE candidate to peer
      await sendSignal(call.id, 'ice-candidate', candidate, recipientUserId);
    });
    
    webrtcService.onRemoteStream((stream) => {
      // Set remote stream in store
      useCallStore.getState().setRemoteStream(stream);
    });
    
    webrtcService.onConnectionStateChange((state) => {
      if (state === 'connected') {
        useCallStore.getState().setCallState('active');
      }
    });
    
    // 4. Create and send SDP offer
    const offer = await webrtcService.createOffer();
    await sendSignal(call.id, 'offer', offer, recipientUserId);
    
  } catch (error) {
    console.error('Failed to set up call:', error);
  }
}
```

### Callee Side (Receiving a Call)

```typescript
import { callRealtimeService } from '@/lib/services/call-realtime-service';
import { webrtcService } from '@/lib/services/webrtc-service';
import { answerCall, sendSignal } from '@/lib/services/call-service';
import { useCallStore } from '@/lib/store/call-store';

// When call_ringing event is received (in onCallRinging handler):
function onCallRinging(call: Call, callerId: string) {
  // Show ringing notification window
  // User can click "Answer" or "Decline"
}

// When user clicks "Answer":
async function handleAnswerCall(call: Call) {
  try {
    // 1. Answer the call via backend
    await answerCall(call.id);
    
    // 2. Get local media stream
    const constraints = {
      audio: true,
      video: call.callType === 'video'
    };
    const localStream = await webrtcService.getLocalStream(constraints);
    useCallStore.getState().setLocalStream(localStream);
    
    // 3. Create peer connection
    webrtcService.createPeerConnection();
    
    // 4. Set up WebRTC event handlers
    webrtcService.onIceCandidate(async (candidate) => {
      await sendSignal(call.id, 'ice-candidate', candidate, call.initiatorId);
    });
    
    webrtcService.onRemoteStream((stream) => {
      useCallStore.getState().setRemoteStream(stream);
    });
    
    webrtcService.onConnectionStateChange((state) => {
      if (state === 'connected') {
        useCallStore.getState().setCallState('active');
      }
    });
    
    // 5. Subscribe to signaling events
    await callRealtimeService.subscribeToSignaling(call.id, {
      onSdpOffer: async (offer, fromUserId) => {
        // Create and send answer
        const answer = await webrtcService.createAnswer(offer);
        await sendSignal(call.id, 'answer', answer, fromUserId);
      },
      
      onIceCandidate: async (candidate, fromUserId) => {
        // Automatically handled by service
      }
    });
    
  } catch (error) {
    console.error('Failed to answer call:', error);
  }
}
```

## Cleanup

Always unsubscribe when appropriate:

```typescript
// Unsubscribe from call events (e.g., on sign out)
await callRealtimeService.unsubscribeFromCallEvents();

// Unsubscribe from signaling (e.g., when call ends)
await callRealtimeService.unsubscribeFromSignaling();

// Unsubscribe from everything
await callRealtimeService.unsubscribeAll();
```

## Integration with React Components

### In Main App Component

```typescript
import { useEffect } from 'react';
import { callRealtimeService } from '@/lib/services/call-realtime-service';
import { useAuthStore } from '@/lib/store/auth-store';

export function App() {
  const user = useAuthStore((state) => state.user);
  
  useEffect(() => {
    if (!user) return;
    
    // Set current user ID
    callRealtimeService.setCurrentUserId(user.id);
    
    // Subscribe to call events
    callRealtimeService.subscribeToCallEvents({
      onCallRinging: (call, callerId) => {
        // Handle incoming call
      },
      onCallAnswered: (call) => {
        // Handle call answered
      },
      onCallDeclined: (call) => {
        // Handle call declined
      },
      onCallEnded: (call) => {
        // Handle call ended
      }
    });
    
    // Cleanup on unmount or sign out
    return () => {
      callRealtimeService.unsubscribeAll();
    };
  }, [user]);
  
  return <div>...</div>;
}
```

## Notes

- The service automatically filters out events from the current user to prevent self-notifications
- The service automatically integrates with the `call-store` to update UI state
- The service automatically integrates with the `webrtc-service` for signaling data handling
- ICE candidates are automatically buffered if received before the remote description is set
- All subscriptions should be cleaned up when no longer needed to prevent memory leaks
