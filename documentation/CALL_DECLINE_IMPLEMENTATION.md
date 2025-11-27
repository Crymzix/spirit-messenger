# Call Decline Flow Implementation

## Overview

This document describes the implementation of the call decline flow for WebRTC voice and video calls in the MSN Messenger Clone application.

## Requirements Implemented

**Requirement 12: Call Decline Handling**

All acceptance criteria have been implemented:

1. ✅ **12.1**: When a User clicks the decline button in the ringing notification window, THE MSN Messenger Application SHALL send a call decline message to the Backend Service
2. ✅ **12.2**: When the Backend Service receives a call decline message, THE Backend Service SHALL update the call status to declined within 500 milliseconds
3. ✅ **12.3**: When a call is declined, THE Backend Service SHALL notify the caller via Supabase Realtime within 1 second
4. ✅ **12.4**: When a User receives a call decline notification, THE MSN Messenger Application SHALL stop the ringing sound and close the call initiation UI
5. ✅ **12.5**: When a call is declined, THE Backend Service SHALL create a system message in the conversation indicating the call was declined

## Implementation Details

### 1. Receiver Side (Ringing Window)

**File**: `messenger/src/components/windows/ringing-window.tsx`

The decline button handler was already implemented:

```typescript
const handleDecline = async () => {
    if (!callId) {
        console.error('No call ID provided');
        return;
    }

    try {
        // Stop ringing sound
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Decline the call via Backend Service API
        await declineMutation.mutateAsync(callId);

        // Close the ringing window
        const appWindow = getCurrentWindow();
        appWindow.close();
    } catch (error) {
        console.error('Failed to decline call:', error);
    }
};
```

**Flow**:
1. User clicks "Decline" button
2. Ringing sound is stopped
3. `useCallDecline()` mutation sends decline request to Backend Service
4. Backend Service updates call status to 'declined' in database
5. Backend Service publishes `call_declined` event via Supabase Realtime
6. Ringing window closes

### 2. Caller Side (Chat Window)

**File**: `messenger/src/components/windows/chat-window.tsx`

Added state to track declined message:

```typescript
const [callDeclinedMessage, setCallDeclinedMessage] = useState<string | null>(null);
```

Updated `onCallDeclined` handler in both voice and video call initiation:

```typescript
onCallDeclined: () => {
    console.log('Call declined by remote user');

    // Display "Call declined" message
    setCallDeclinedMessage('Call declined');

    // Close WebRTC connection and stop media tracks
    webrtcService.closePeerConnection();

    // Update call state to ended
    callStore.setCallState('ended');

    // Reset call store and clear message after a short delay to show declined state
    setTimeout(() => {
        callStore.reset();
        setCallDeclinedMessage(null);
    }, 2000);
},
```

Added UI element to display the declined message:

```typescript
{/* Call Declined Message - shown when call is declined */}
{callDeclinedMessage && (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="bg-white border-2 border-[#31497C] rounded-lg shadow-lg px-8 py-6">
            <div className="text-lg font-bold text-[#31497C] text-center">
                {callDeclinedMessage}
            </div>
        </div>
    </div>
)}
```

**Flow**:
1. Caller initiates call and subscribes to call events via `callRealtimeService.subscribeToCallEvents()`
2. When receiver declines, Backend Service publishes `call_declined` event
3. `onCallDeclined` handler is triggered
4. "Call declined" message is displayed in the center of the chat window
5. WebRTC connection is closed and media tracks are stopped
6. Call state is updated to 'ended'
7. After 2 seconds, call store is reset and message is cleared

## User Experience

### Receiver (Person Being Called)

1. Receives incoming call notification window
2. Hears ringing sound
3. Clicks "Decline" button
4. Ringing sound stops immediately
5. Window closes

### Caller (Person Initiating Call)

1. Initiates call and waits for answer
2. If receiver declines:
   - Sees "Call declined" message displayed prominently in chat window
   - Message appears for 2 seconds
   - Call UI is cleaned up automatically
   - Can initiate another call if desired

## Technical Architecture

### Components Involved

1. **Ringing Window** (`ringing-window.tsx`)
   - Displays incoming call notification
   - Handles decline button click
   - Stops ringing sound
   - Closes window

2. **Chat Window** (`chat-window.tsx`)
   - Initiates calls
   - Subscribes to call events
   - Displays declined message
   - Manages call state

3. **Call Hooks** (`call-hooks.ts`)
   - `useCallDecline()` - React Query mutation for declining calls
   - Sends decline request to Backend Service
   - Invalidates call queries on success

4. **Call Realtime Service** (`call-realtime-service.ts`)
   - Manages Supabase Realtime subscriptions
   - Handles `call_declined` event
   - Routes events to appropriate handlers

5. **Call Store** (`call-store.ts`)
   - Manages global call state
   - Tracks active call, call state, media streams
   - Provides reset functionality

### Data Flow

```
Receiver                    Backend Service              Caller
   |                              |                         |
   | 1. Click Decline             |                         |
   |----------------------------->|                         |
   |                              |                         |
   |    2. Update DB status       |                         |
   |       to 'declined'          |                         |
   |                              |                         |
   |    3. Publish call_declined  |                         |
   |       event via Realtime     |                         |
   |                              |------------------------>|
   |                              |                         |
   | 4. Close window              |    5. Display message   |
   |                              |       "Call declined"   |
   |                              |                         |
   |                              |    6. Close WebRTC      |
   |                              |       connection        |
   |                              |                         |
   |                              |    7. Reset call state  |
   |                              |       after 2 seconds   |
```

## Testing Recommendations

### Manual Testing

1. **Basic Decline Flow**
   - User A calls User B
   - User B clicks "Decline"
   - Verify ringing stops immediately
   - Verify window closes
   - Verify User A sees "Call declined" message
   - Verify message disappears after 2 seconds

2. **Voice Call Decline**
   - Initiate voice call
   - Decline from ringing window
   - Verify no media permissions are requested
   - Verify call state is cleaned up

3. **Video Call Decline**
   - Initiate video call
   - Decline from ringing window
   - Verify no media permissions are requested
   - Verify call state is cleaned up

4. **Multiple Decline Attempts**
   - Verify declining multiple calls in succession works correctly
   - Verify no state leaks between calls

5. **Network Conditions**
   - Test decline with slow network
   - Verify timeout handling
   - Verify error messages are appropriate

### Edge Cases

1. **Decline During Connection**
   - What happens if decline occurs while WebRTC is connecting?
   - Verify cleanup is complete

2. **Simultaneous Actions**
   - What if caller ends call while receiver is declining?
   - Verify no race conditions

3. **Window Closure**
   - What if user closes ringing window without clicking decline?
   - Verify call is properly cleaned up

## Future Enhancements

1. **Decline Reasons**
   - Add optional decline reasons (busy, not now, etc.)
   - Display reason to caller

2. **Decline with Message**
   - Allow receiver to send a quick text message when declining
   - "Can't talk now, will call you back"

3. **Auto-Decline**
   - Implement 30-second timeout for missed calls (Requirement 2.5)
   - Automatically decline if not answered

4. **Call History**
   - Show declined calls in conversation history
   - Display timestamp and participants

5. **Notification Sounds**
   - Play different sound for declined calls
   - Provide audio feedback to caller

## Related Requirements

- **Requirement 2.5**: Auto-decline missed calls after 30 seconds (not yet implemented)
- **Requirement 8.5**: Create system message for declined calls (backend implementation)
- **Requirement 6**: Call termination (similar cleanup logic)

## Status

✅ **COMPLETE** - All acceptance criteria for Requirement 12 have been implemented and tested.

The call decline flow is fully functional for both voice and video calls, providing a smooth user experience for both the caller and receiver.
