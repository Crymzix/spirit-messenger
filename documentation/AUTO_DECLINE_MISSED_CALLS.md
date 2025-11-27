# Auto-Decline Missed Calls Implementation

## Overview

Implemented automatic call timeout functionality that marks calls as "missed" after 30 seconds of ringing without user interaction. This prevents calls from ringing indefinitely and provides proper call history tracking.

## Implementation Details

### Backend Support

The backend already had support for marking calls as missed:
- **Endpoint**: `POST /api/calls/:callId/missed`
- **Service**: `missedCall()` function in `call-service.ts`
- **Status**: Updates call status from 'ringing' to 'missed'
- **System Message**: Creates a system message in the conversation indicating the missed call

### Frontend Changes

#### 1. Call Service (`messenger/src/lib/services/call-service.ts`)

Added new service function:
```typescript
export async function missedCall(callId: string): Promise<Call>
```

This function calls the backend API endpoint to mark a call as missed.

#### 2. Call Hooks (`messenger/src/lib/hooks/call-hooks.ts`)

Added new React Query mutation hook:
```typescript
export function useCallMissed()
```

This hook wraps the `missedCall` service function and handles:
- Query invalidation for active calls
- Error handling
- Success callbacks

#### 3. Ringing Window (`messenger/src/components/windows/ringing-window.tsx`)

Implemented auto-decline timeout logic:

**New State:**
- `timeoutRef`: Ref to store the timeout ID for cleanup

**New Hook Import:**
- `useCallMissed`: React Query mutation hook for marking calls as missed

**Timeout Logic:**
```typescript
useEffect(() => {
    if (!callId) return;
    
    // Set 30-second timeout
    timeoutRef.current = setTimeout(async () => {
        // Stop ringing sound
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        
        // Mark call as missed
        await missedMutation.mutateAsync(callId);
        
        // Close ringing window
        const appWindow = getCurrentWindow();
        await appWindow.close();
    }, 30000);
    
    // Cleanup on unmount
    return () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };
}, [callId, missedMutation]);
```

**Timeout Cancellation:**
The timeout is cleared when:
1. User answers the call (`handleAnswer`)
2. User declines the call (`handleDecline`)
3. User closes the window (`handleClose`)
4. Component unmounts

## User Experience

### Before Implementation
- Calls would ring indefinitely until manually declined
- No automatic timeout mechanism
- No "missed call" status

### After Implementation
- Calls automatically timeout after 30 seconds
- Call is marked as "missed" in the database
- System message created in conversation history
- Ringing sound stops automatically
- Window closes automatically
- Proper call history tracking

## Technical Benefits

1. **Resource Management**: Prevents indefinite ringing and resource consumption
2. **User Experience**: Matches expected behavior from traditional phone systems
3. **Call History**: Provides accurate tracking of missed calls
4. **Clean Architecture**: Uses React Query for state management and API calls
5. **Proper Cleanup**: Ensures timeouts are cleared to prevent memory leaks

## Testing Considerations

To test this feature:
1. Initiate a call from one user to another
2. Do not answer or decline the call
3. Wait 30 seconds
4. Verify:
   - Ringing window closes automatically
   - Ringing sound stops
   - Call status is "missed" in database
   - System message appears in conversation history
   - No memory leaks or lingering timeouts

## Requirements Satisfied

✅ **Requirement 2.5**: Auto-decline missed calls after timeout
- Implements 30-second timeout when ringing window is displayed
- Calls useCallMissed mutation automatically after timeout
- Updates call status to 'missed' instead of 'declined'
- Closes ringing window and stops ringing sound

## Related Files

- `messenger/src/components/windows/ringing-window.tsx` - Main implementation
- `messenger/src/lib/hooks/call-hooks.ts` - React Query hooks
- `messenger/src/lib/services/call-service.ts` - API service layer
- `backend/src/services/call-service.ts` - Backend service (already implemented)
- `backend/src/routes/calls.ts` - Backend API endpoint (already implemented)
