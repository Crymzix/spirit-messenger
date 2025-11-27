# MessageContent Component - Call History Support

## Overview

The `MessageContent` component has been updated to support displaying call history messages in the chat window. Call history messages are system messages that display information about voice and video calls.

## Features

### Call Message Detection
- Automatically detects system messages with call metadata
- Checks for `messageType === 'system'` and presence of `callId` and `callType` in metadata

### Call Types
- **Voice calls**: Displayed with 📞 icon
- **Video calls**: Displayed with 📹 icon

### Call Statuses

#### Completed Calls
- **Color**: Green (`text-green-700`)
- **Format**: `[Icon] Voice/Video call - MM:SS`
- **Example**: `📞 Voice call - 5:23`

#### Declined Calls
- **Color**: Red (`text-red-600`)
- **Format**: `[Icon] Voice/Video call declined`
- **Example**: `📹 Video call declined`

#### Missed Calls
- **Color**: Orange (`text-orange-600`)
- **Format**: `[Icon] Missed voice/video call`
- **Example**: `📞 Missed voice call`

## Usage

### Basic Usage
```tsx
<MessageContent
  content="Voice call - 5:23"
  messageType="system"
  metadata={{
    callId: "call-123",
    callType: "voice",
    status: "completed",
    durationSeconds: 323
  }}
/>
```

### Example Messages

#### Completed Voice Call
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
Renders: 📞 Voice call - 5:23 (in green)

#### Declined Video Call
```tsx
<MessageContent
  content="Video call declined"
  messageType="system"
  metadata={{
    callId: "def-456",
    callType: "video",
    status: "declined"
  }}
/>
```
Renders: 📹 Video call declined (in red)

#### Missed Voice Call
```tsx
<MessageContent
  content="Missed voice call"
  messageType="system"
  metadata={{
    callId: "ghi-789",
    callType: "voice",
    status: "missed"
  }}
/>
```
Renders: 📞 Missed voice call (in orange)

## Backend Integration

The backend `CallService` creates these system messages automatically:

### On Call End (Completed)
```typescript
const systemMessage: InsertMessage = {
  conversationId: call.conversationId,
  senderId: userId,
  content: `${call.callType === 'voice' ? 'Voice' : 'Video'} call - ${durationFormatted}`,
  messageType: 'system',
  metadata: {
    callId: callId,
    callType: call.callType,
    durationSeconds: durationSeconds,
    status: 'completed',
  },
};
```

### On Call Decline
```typescript
const systemMessage: InsertMessage = {
  conversationId: call.conversationId,
  senderId: userId,
  content: `${call.callType === 'voice' ? 'Voice' : 'Video'} call declined`,
  messageType: 'system',
  metadata: {
    callId: callId,
    callType: call.callType,
    status: 'declined',
  },
};
```

### On Missed Call
```typescript
const systemMessage: InsertMessage = {
  conversationId: call.conversationId,
  senderId: call.initiatorId,
  content: `Missed ${call.callType === 'voice' ? 'voice' : 'video'} call`,
  messageType: 'system',
  metadata: {
    callId: callId,
    callType: call.callType,
    status: 'missed',
  },
};
```

## Styling

Call messages use italic text and are styled with appropriate colors:
- Completed: Green (`text-green-700`)
- Declined: Red (`text-red-600`)
- Missed: Orange (`text-orange-600`)

The icon and text are displayed in a flex container with a gap for proper spacing.

## Requirements Satisfied

This implementation satisfies the following requirements from the WebRTC tasks:

- ✅ 8.2: Display call icon (phone or video) based on call_type in metadata
- ✅ 8.3: Display call duration for completed calls
- ✅ 8.4: Display call status (missed, declined, completed) with appropriate styling
- ✅ 8.5: Add timestamp display for call messages (handled by chat window)
- ✅ Style call history messages to match MSN Messenger system messages
