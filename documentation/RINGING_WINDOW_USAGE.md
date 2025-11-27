# Ringing Window Usage Guide

## Overview

The `RingingWindow` component displays an incoming call notification with the caller's information and provides options to answer or decline the call. It automatically plays a ringing sound and positions itself appropriately based on the platform.

## Features

- **Caller Information Display**: Shows caller's display picture, name, and call type (voice/video)
- **Ringing Sound**: Automatically plays a looping ringing sound (`/sounds/video_call.mp3`)
- **Answer/Decline Actions**: Provides buttons to answer or decline the call using React Query hooks
- **Auto-positioning**: Positions window based on platform (top-right on macOS, bottom-right on Windows/Linux)
- **Sound Cleanup**: Automatically stops ringing sound when component unmounts

## Opening the Ringing Window

To open the ringing window when an incoming call is received, use Tauri's window creation API:

```typescript
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

// When receiving a call_ringing event via Supabase Realtime
const openRingingWindow = async (call: Call, caller: User) => {
    const windowLabel = `ringing-${call.id}`;
    
    const ringingWindow = new WebviewWindow(windowLabel, {
        url: `ringing-window.html?callId=${call.id}&callType=${call.callType}&callerId=${caller.id}`,
        title: 'Incoming Call',
        width: 350,
        height: 450,
        resizable: false,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
    });

    await ringingWindow.once('tauri://created', () => {
        console.log('Ringing window created');
    });

    await ringingWindow.once('tauri://error', (e) => {
        console.error('Error creating ringing window:', e);
    });
};
```

## Query Parameters

The ringing window expects the following query parameters:

- `callId` (required): The ID of the incoming call
- `callType` (required): The type of call - either `'voice'` or `'video'`
- `callerId` (required): The ID of the user who is calling

## Integration with Call Flow

### 1. Receiving Call Notification

When a call is initiated, the recipient should receive a `call_ringing` event via Supabase Realtime:

```typescript
// In call-realtime-service.ts or similar
const subscribeToCallEvents = (userId: string) => {
    const channel = supabase
        .channel(`user:${userId}:calls`)
        .on('broadcast', { event: 'call_ringing' }, (payload) => {
            const { call, caller } = payload;
            
            // Open ringing window
            openRingingWindow(call, caller);
        })
        .subscribe();
        
    return channel;
};
```

### 2. Handling Answer Action

When the user clicks "Answer", the component:
1. Stops the ringing sound
2. Calls `useCallAnswer()` mutation with the call ID
3. Closes the ringing window
4. The main application should then proceed with the call answering flow (see task 15)

### 3. Handling Decline Action

When the user clicks "Decline", the component:
1. Stops the ringing sound
2. Calls `useCallDecline()` mutation with the call ID
3. Closes the ringing window
4. The backend updates the call status to 'declined'

### 4. Auto-decline on Timeout

For auto-declining missed calls after 30 seconds (Requirement 2.5), implement a timeout in the component that opens the ringing window:

```typescript
const openRingingWindow = async (call: Call, caller: User) => {
    // ... window creation code ...
    
    // Auto-decline after 30 seconds
    const timeoutId = setTimeout(async () => {
        try {
            await declineCall(call.id);
            const window = WebviewWindow.getByLabel(windowLabel);
            if (window) {
                await window.close();
            }
        } catch (error) {
            console.error('Failed to auto-decline call:', error);
        }
    }, 30000);
    
    // Clear timeout if window is closed manually
    const window = WebviewWindow.getByLabel(windowLabel);
    if (window) {
        await window.once('tauri://destroyed', () => {
            clearTimeout(timeoutId);
        });
    }
};
```

## Sound Files

The ringing window uses `/sounds/video_call.mp3` for the ringing sound. This file should exist in the `messenger/public/sounds/` directory.

## Styling

The component uses the classic MSN Messenger styling with:
- Gradient background: `linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)`
- MSN blue text color: `#31497C`
- Border color: `#9A9FD0`
- Green answer button and red decline button

## Dependencies

- `@tauri-apps/api` - For window management and positioning
- `@tauri-apps/plugin-positioner` - For platform-specific window positioning
- `@tauri-apps/plugin-os` - For platform detection
- `@tanstack/react-query` - For call mutations (answer/decline)
- `boring-avatars` - For fallback avatar display
- Supabase client - For fetching caller information

## Error Handling

The component handles the following error cases:
- Missing query parameters (callId, callType, callerId)
- Failed to fetch caller information from database
- Failed to play ringing sound
- Failed to answer/decline call (displays error in console)

## Next Steps

After implementing the ringing window, the next tasks are:
- Task 14: Implement call initiation flow (caller side)
- Task 15: Implement call answering flow (receiver side)
- Task 16: Implement ICE candidate exchange
- Task 17: Implement P2P connection establishment
