# WebRTC Connection Error Handling

## Overview

This document describes the implementation of connection error handling for WebRTC calls, fulfilling requirements 11.2, 11.3, and 11.4.

## Requirements Implemented

### Requirement 11.2: Connection Failed State
- **Requirement**: Display error message "Connection failed. Please check your network." for 'failed' state
- **Implementation**: When RTCPeerConnectionState becomes 'failed', the connection handler displays the error message via callback

### Requirement 11.3: Reconnection Attempt
- **Requirement**: Implement 5-second reconnection attempt for 'disconnected' state
- **Implementation**: When connection state becomes 'disconnected', the handler monitors the connection for 5 seconds, checking every 500ms for reconnection

### Requirement 11.4: Reconnection Failure
- **Requirement**: End call if reconnection fails and display disconnection message
- **Implementation**: If reconnection doesn't succeed within 5 seconds, the handler displays "Connection lost. Unable to reconnect." and ends the call

## Architecture

### Components

1. **WebRTCConnectionHandler** (`webrtc-connection-handler.ts`)
   - Manages connection state changes
   - Implements reconnection logic
   - Provides callbacks for error display and call termination

2. **CallErrorDialog** (`call-error-dialog.tsx`)
   - Displays user-friendly error messages
   - Handles both media permission errors and connection errors
   - Provides contextual help based on error type

3. **Integration Points**
   - `ringing-window.tsx`: Displays errors during call answering
   - `chat-window.tsx`: Displays errors during call initiation (voice and video)

## Connection State Flow

```
┌─────────────┐
│    new      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ connecting  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  connected  │────▶│ disconnected │
└─────────────┘     └──────┬───────┘
                           │
                           │ Monitor for 5 seconds
                           │
                    ┌──────┴───────┐
                    │              │
                    ▼              ▼
            ┌─────────────┐  ┌─────────┐
            │ reconnected │  │ timeout │
            └─────────────┘  └────┬────┘
                                  │
                                  ▼
                            ┌──────────┐
                            │  failed  │
                            └──────────┘
```

## Error Messages

### Connection Failed
- **Message**: "Connection failed. Please check your network."
- **Trigger**: RTCPeerConnectionState = 'failed'
- **Action**: End call immediately

### Connection Lost
- **Message**: "Connection lost. Unable to reconnect."
- **Trigger**: Reconnection timeout after 5 seconds
- **Action**: End call after timeout

### Helpful Tips
The error dialog provides contextual help:
- Check internet connection
- Verify network allows WebRTC connections
- Try again in a few moments
- Contact network administrator if issue persists

## Usage Example

```typescript
// Create connection state handler with callbacks
const { handler: connectionStateHandler, cleanup: cleanupConnectionHandler } =
    createConnectionStateHandler(
        async () => {
            // Callback when call should end due to connection failure
            await endCall(callId);
        },
        (errorMessage: string) => {
            // Callback for displaying connection errors
            setCallError(errorMessage);
        }
    );

// Set up WebRTC event handlers
webrtcService.setEventHandlers({
    onConnectionStateChange: connectionStateHandler,
    // ... other handlers
});

// Cleanup when component unmounts
useEffect(() => {
    return () => {
        cleanupConnectionHandler();
    };
}, []);
```

## Testing Scenarios

### Manual Testing

1. **Connection Failure**
   - Start a call
   - Disable network connection
   - Verify error message appears
   - Verify call ends

2. **Reconnection Success**
   - Start a call
   - Briefly interrupt network (< 5 seconds)
   - Verify call continues after reconnection

3. **Reconnection Failure**
   - Start a call
   - Disable network for > 5 seconds
   - Verify reconnection timeout message
   - Verify call ends

### Network Simulation

Use browser DevTools to simulate network conditions:
- Offline mode
- Slow 3G
- Network throttling

## Error Recovery

The implementation provides graceful degradation:

1. **Automatic Reconnection**: Attempts to recover from temporary disconnections
2. **User Notification**: Clear error messages explain what went wrong
3. **Resource Cleanup**: Properly closes connections and releases media devices
4. **State Reset**: Resets call store to idle state after errors

## Future Enhancements

Potential improvements:
- Add retry button to error dialog
- Implement exponential backoff for reconnection
- Add connection quality indicators before failure
- Log connection errors for debugging
- Support TURN server fallback for difficult networks
