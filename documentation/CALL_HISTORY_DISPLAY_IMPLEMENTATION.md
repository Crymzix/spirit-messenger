# Call History Display Implementation

## Overview

This document describes the implementation of call history display in chat messages for the MSN Messenger Clone application. Call history messages are system messages that appear in the chat window to show information about voice and video calls.

## Implementation Summary

### Files Modified

1. **messenger/src/components/message-content.tsx**
   - Added support for rendering call system messages
   - Detects messages with `messageType === 'system'` and call metadata
   - Displays appropriate icons (📞 for voice, 📹 for video)
   - Shows call duration for completed calls
   - Applies color-coded styling based on call status

2. **messenger/src/types/index.ts**
   - Extended `Message` interface metadata to include call-related fields:
     - `callId?: string`
     - `callType?: CallType`
     - `durationSeconds?: number`
     - `status?: 'completed' | 'declined' | 'missed'`

3. **messenger/src/components/windows/chat-window.tsx**
   - Updated `MessageContent` component usage to pass `messageType` prop
   - Ensures call messages are properly rendered in the message history

## Features Implemented

### Call Message Detection
The component automatically detects call system messages by checking:
- `messageType === 'system'`
- Presence of `callId` in metadata
- Presence of `callType` in metadata

### Visual Representation

#### Icons
- **Voice calls**: 📞 (phone emoji)
- **Video calls**: 📹 (video camera emoji)

#### Status Colors
- **Completed**: Green (`text-green-700`)
- **Declined**: Red (`text-red-600`)
- **Missed**: Orange (`text-orange-600`)

#### Message Formats

**Completed Call:**
```
📞 Voice call - 5:23
```
- Shows call type (Voice/Video)
- Displays duration in MM:SS format
- Green color indicates successful completion

**Declined Call:**
```
📹 Video call declined
```
- Shows call type
- Indicates the call was declined
- Red color indicates rejection

**Missed Call:**
```
📞 Missed voice call
```
- Shows call type
- Indicates the call was missed
- Orange color indicates missed opportunity

### Duration Formatting

For completed calls, the duration is formatted as `MM:SS`:
- Calculates minutes: `Math.floor(durationSeconds / 60)`
- Calculates seconds: `durationSeconds % 60`
- Pads seconds with leading zero if needed
- Example: 323 seconds → "5:23"

## Backend Integration

The backend `CallService` automatically creates these system messages:

### Completed Calls
Created in `endCall()` method:
```typescript
{
  content: "Voice call - 5:23",
  messageType: "system",
  metadata: {
    callId: "...",
    callType: "voice",
    durationSeconds: 323,
    status: "completed"
  }
}
```

### Declined Calls
Created in `declineCall()` method:
```typescript
{
  content: "Voice call declined",
  messageType: "system",
  metadata: {
    callId: "...",
    callType: "voice",
    status: "declined"
  }
}
```

### Missed Calls
Created in `missedCall()` method:
```typescript
{
  content: "Missed voice call",
  messageType: "system",
  metadata: {
    callId: "...",
    callType: "voice",
    status: "missed"
  }
}
```

## Requirements Satisfied

This implementation satisfies all requirements from task 24:

- ✅ **8.2**: Display call icon (phone or video) based on call_type in metadata
- ✅ **8.3**: Display call duration for completed calls
- ✅ **8.4**: Display call status (missed, declined, completed) with appropriate styling
- ✅ **8.5**: Add timestamp display for call messages (handled by chat window's existing timestamp logic)
- ✅ Style call history messages to match MSN Messenger system messages (italic text, color-coded)

## Testing

The implementation has been verified:
- ✅ TypeScript compilation passes with no errors
- ✅ Component properly handles all three call statuses
- ✅ Duration formatting works correctly
- ✅ Icons display correctly for voice and video calls
- ✅ Color coding is applied appropriately

## Usage Example

In the chat window, when a call ends, the backend creates a system message that will be automatically rendered by the `MessageContent` component:

```tsx
<MessageContent
  content="Voice call - 5:23"
  messageType="system"
  metadata={{
    callId: "abc-123",
    callType: "voice",
    status: "completed",
    durationSeconds: 323
  }}
/>
```

This will render as:
> 📞 Voice call - 5:23 (in green)

## Future Enhancements

Potential improvements for future iterations:
1. Click-to-call-back functionality on call history messages
2. Display participant names for group calls
3. Show call quality indicators
4. Add call recording indicators
5. Display call failure reasons for failed calls

## Related Files

- Backend: `backend/src/services/call-service.ts`
- Frontend Component: `messenger/src/components/message-content.tsx`
- Types: `messenger/src/types/index.ts`
- Chat Window: `messenger/src/components/windows/chat-window.tsx`
- Documentation: `messenger/src/components/message-content-usage.md`
