# Simultaneous Call Prevention UI Implementation

## Overview

This document describes the frontend UI implementation for preventing simultaneous calls in the MSN Messenger Clone. The implementation ensures users cannot initiate multiple calls at once and provides clear feedback when call initiation fails due to busy status.

## Requirements

Implements requirements from `.kiro/specs/msn-messenger-clone/webrtc-requirements.md`:
- **13.3**: Display error message when call initiation fails due to busy status
- **13.4**: Disable call buttons when user has active or ringing call
- **13.5**: Re-enable buttons when active call ends

## Implementation Details

### 1. Call Button State Management

The `canInitiateCall` computed value determines whether call buttons should be enabled:

```typescript
const canInitiateCall = useMemo(() => {
    // Cannot initiate call if there's already an active call
    if (hasActiveCall) {
        return false;
    }

    // Cannot initiate call if contact is blocked
    if (isContactBlocked) {
        return false;
    }

    // Cannot initiate call if contact is offline or appear offline
    if (participants.length > 0) {
        const participant = participants[0];
        if (participant?.presenceStatus === 'offline' || 
            participant?.presenceStatus === 'appear_offline') {
            return false;
        }
    }

    // Cannot initiate call if conversation is not loaded
    if (!conversation?.id) {
        return false;
    }

    return true;
}, [hasActiveCall, isContactBlocked, participants, conversation?.id]);
```

### 2. Button Disabled State

Call buttons are visually disabled and non-interactive when `canInitiateCall` is false:

```typescript
<div
    onClick={canInitiateCall ? handleVideoCallClick : undefined}
    className={`whitespace-nowrap box-border hidden min-[346px]:block ${
        canInitiateCall 
            ? 'cursor-pointer hover:opacity-80' 
            : 'opacity-50 cursor-not-allowed'
    }`}
    title={
        !canInitiateCall 
            ? (hasActiveCall 
                ? 'You are already in a call' 
                : (isContactBlocked 
                    ? 'Cannot call blocked contact' 
                    : 'Contact is offline'))
            : 'Start video call'
    }
>
```

**Key Features:**
- `onClick` handler only attached when `canInitiateCall` is true
- Visual feedback via opacity (50% when disabled)
- Cursor changes to `not-allowed` when disabled
- Descriptive tooltip explains why button is disabled

### 3. Error Handling for Busy Status

When a call initiation fails due to busy status (409 Conflict from backend), a user-friendly error message is displayed:

```typescript
try {
    const call = await callInitiateMutation.mutateAsync({
        conversationId: conversation.id,
        callType: 'voice',
    });
    // ... call setup logic
} catch (error: any) {
    console.error('Failed to initiate voice call:', error);

    let errorMessage = 'Failed to initiate call';
    if (error instanceof Error) {
        errorMessage = error.message;
    }

    // Check if error is due to user being busy
    if (errorMessage.includes('User is currently on another call') || 
        errorMessage.includes('USER_BUSY')) {
        setCallBusyError('You or your contact is currently on another call. Please try again later.');
        
        // Clear the error after 5 seconds
        setTimeout(() => {
            setCallBusyError(null);
        }, 5000);
    } else {
        // For other errors, show in the call error dialog
        setCallError(errorMessage);
    }

    // Clean up on error
    const callStore = useCallStore.getState();
    callStore.reset();
}
```

### 4. Busy Error Notification UI

A prominent notification banner displays when a call fails due to busy status:

```typescript
{callBusyError && (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border-2 border-red-500 rounded-lg px-6 py-3 shadow-lg">
        <div className="flex items-center gap-3">
            <div className="text-red-700 font-bold text-lg">⚠</div>
            <div className="text-red-800 font-verdana text-sm">{callBusyError}</div>
            <button
                onClick={() => setCallBusyError(null)}
                className="ml-2 text-red-700 hover:text-red-900 font-bold"
            >
                ✕
            </button>
        </div>
    </div>
)}
```

**Features:**
- Fixed position at top center of window
- High z-index (50) to appear above other content
- Red color scheme for error indication
- Warning icon (⚠) for visual emphasis
- Close button for manual dismissal
- Auto-dismisses after 5 seconds

### 5. Automatic Re-enabling

Buttons automatically re-enable when the call ends:

```typescript
// Clear busy error when call state changes (call ends)
useEffect(() => {
    if (callState === 'idle' || callState === 'ended') {
        // Clear any busy error messages when call ends
        setCallBusyError(null);
    }
}, [callState]);
```

The `canInitiateCall` computed value automatically updates when:
- `hasActiveCall` changes (from call store)
- `callState` changes to 'idle' or 'ended'
- Contact presence status changes

## Backend Integration

### Error Response Format

The backend returns a 409 Conflict status when a user tries to initiate a call while busy:

```typescript
// From backend/src/services/call-service.ts
if (existingCalls.length > 0) {
    throw new CallServiceError(
        'User is currently on another call',
        'USER_BUSY',
        409
    );
}
```

### Frontend Error Detection

The frontend detects busy errors by checking the error message:

```typescript
if (errorMessage.includes('User is currently on another call') || 
    errorMessage.includes('USER_BUSY')) {
    // Show busy error notification
}
```

## User Experience Flow

### Scenario 1: User Already in Call

1. User is in an active call
2. Call buttons are disabled (opacity 50%, cursor not-allowed)
3. Hovering shows tooltip: "You are already in a call"
4. Clicking does nothing (no onClick handler attached)
5. When call ends, buttons automatically re-enable

### Scenario 2: Contact Already in Call

1. User clicks call button
2. Backend checks if contact has active call
3. Backend returns 409 error with "USER_BUSY" code
4. Frontend displays notification: "You or your contact is currently on another call. Please try again later."
5. Notification auto-dismisses after 5 seconds
6. User can manually dismiss by clicking ✕

### Scenario 3: Contact Offline

1. Contact presence status is 'offline' or 'appear_offline'
2. Call buttons are disabled
3. Hovering shows tooltip: "Contact is offline"
4. Clicking does nothing

## Testing Considerations

### Manual Testing

1. **Test simultaneous call prevention:**
   - Open two chat windows with different contacts
   - Initiate a call in one window
   - Try to initiate a call in the other window
   - Verify buttons are disabled and show correct tooltip

2. **Test busy error display:**
   - Have two users (A and B)
   - User A calls User C
   - User B tries to call User C
   - Verify User B sees busy error notification

3. **Test button re-enabling:**
   - Initiate a call
   - Verify buttons are disabled
   - End the call
   - Verify buttons re-enable immediately

4. **Test error auto-dismiss:**
   - Trigger a busy error
   - Wait 5 seconds
   - Verify notification disappears

5. **Test manual dismiss:**
   - Trigger a busy error
   - Click the ✕ button
   - Verify notification disappears immediately

### Edge Cases

- **Multiple rapid clicks:** onClick handler only attached when enabled, prevents race conditions
- **Call state transitions:** useEffect watches callState changes to clear errors
- **Network errors:** Non-busy errors shown in CallErrorDialog instead of notification
- **Blocked contacts:** Separate check prevents calls to blocked contacts

## Files Modified

- `messenger/src/components/windows/chat-window.tsx`
  - Added `callBusyError` state
  - Enhanced error handling in `handleVoiceCallClick` and `handleVideoCallClick`
  - Added busy error notification UI
  - Improved button tooltips with detailed disable reasons
  - Added useEffect to clear busy errors when call ends
  - Conditional onClick handlers to prevent clicks when disabled

## Related Documentation

- [Call Error Handling Implementation](./CALL_ERROR_HANDLING_IMPLEMENTATION.md)
- [Simultaneous Call Prevention Verification](./SIMULTANEOUS_CALL_PREVENTION_VERIFICATION.md)
- [WebRTC Requirements](../.kiro/specs/msn-messenger-clone/webrtc-requirements.md)

## Future Enhancements

1. **Visual indicator on contact list:** Show when a contact is in a call
2. **Call waiting:** Allow users to queue calls when contact is busy
3. **Busy status:** Automatically set presence to "busy" during calls
4. **Call history:** Show missed calls due to busy status differently
5. **Sound notification:** Play a busy tone when call fails due to busy status
