# Media Permission Error Handling

## Overview

This document describes the implementation of comprehensive error handling for media permissions (microphone/camera access) in the WebRTC calling feature.

**Requirements:** 11.1

## Implementation

### 1. WebRTC Service Error Handling

The `webrtcService.getLocalStream()` method now wraps `getUserMedia` calls in try-catch blocks and handles specific error types:

- **NotAllowedError**: User denied permission → "Microphone/camera permission denied"
- **NotFoundError**: No device found → "No microphone or camera found"
- **NotReadableError**: Device in use → "Device already in use"
- **OverconstrainedError**: Device doesn't meet requirements → "Camera/microphone does not meet requirements"
- **TypeError**: Invalid constraints → "Invalid media constraints"
- **AbortError**: Access aborted → "Media access was aborted"

### 2. MediaErrorDialog Component

A reusable modal dialog component (`media-error-dialog.tsx`) that:

- Displays user-friendly error messages
- Shows contextual help tips based on error type
- Provides an "OK" button to dismiss
- Styled to match MSN Messenger aesthetic

### 3. Integration Points

#### Ringing Window (Call Answering)

When a user answers a call:
1. Requests media permissions via `webrtcService.getLocalStream()`
2. If error occurs:
   - Displays error in `MediaErrorDialog`
   - Automatically declines the call
   - Resets call state
   - Window closes when user acknowledges error

#### Chat Window (Call Initiation)

When a user initiates a voice or video call:
1. Requests media permissions via `webrtcService.getLocalStream()`
2. If error occurs:
   - Displays error in `MediaErrorDialog`
   - Ends the call via backend API
   - Closes WebRTC connection
   - Resets call state
   - User can dismiss error and continue using chat

## Error Flow

```
User Action (Answer/Initiate Call)
    ↓
Request Media Permissions
    ↓
getUserMedia() throws error
    ↓
WebRTC Service catches and transforms error
    ↓
Component displays MediaErrorDialog
    ↓
User acknowledges error
    ↓
Call is ended/declined
    ↓
Resources cleaned up
```

## User Experience

### Permission Denied
- **Message**: "Microphone/camera permission denied"
- **Help**: Instructions to check browser/system permissions and allow access

### Device Not Found
- **Message**: "No microphone or camera found"
- **Help**: Instructions to connect device and verify system recognition

### Device In Use
- **Message**: "Device already in use"
- **Help**: Instructions to close other applications and end other calls

## Testing

To test error handling:

1. **Permission Denied**: Deny microphone/camera permission when prompted
2. **Device Not Found**: Disconnect microphone/camera before initiating call
3. **Device In Use**: Start a call in another application first

Expected behavior: Error dialog appears with appropriate message and help text, call is properly terminated, resources are cleaned up.

## Code Locations

- **WebRTC Service**: `messenger/src/lib/services/webrtc-service.ts`
- **Error Dialog**: `messenger/src/components/media-error-dialog.tsx`
- **Ringing Window**: `messenger/src/components/windows/ringing-window.tsx`
- **Chat Window**: `messenger/src/components/windows/chat-window.tsx`
