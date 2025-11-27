# Call Error Handling Implementation

## Overview

This document describes the implementation of comprehensive error handling and call failure tracking for the WebRTC calling system, as specified in task 31 of the webrtc-tasks.md.

## Implementation Details

### 1. RealtimePublisher Enhancement

**File:** `backend/src/lib/realtime-publisher.ts`

Added support for publishing `call_failed` events:

- **New Interface:** `CallFailedPayload` - Contains callId, conversationId, and errorReason
- **New Method:** `publishCallFailed()` - Broadcasts call failure events to all participants

```typescript
export interface CallFailedPayload {
    callId: string;
    conversationId: string;
    errorReason: string;
}

async publishCallFailed(
    participantUserIds: string[],
    payload: CallFailedPayload
): Promise<void>
```

### 2. CallService Error Handling

**File:** `backend/src/services/call-service.ts`

#### New Helper Function: `markCallAsFailed()`

Internal helper function that:
- Updates call status to 'failed'
- Records the error reason in the `error_reason` column
- Sets the `ended_at` timestamp
- Publishes `call_failed` event to all participants via Supabase Realtime

```typescript
async function markCallAsFailed(
    callId: string,
    conversationId: string,
    errorReason: string
): Promise<void>
```

#### Enhanced Error Handling in All Call Operations

Each call operation now includes comprehensive error handling:

##### `initiateCall()`
- Catches errors when publishing call_ringing event
- Marks call as failed if notification fails
- Error reason: "Failed to notify recipient"

##### `answerCall()`
- Catches errors when creating call participants
- Catches errors when publishing call_answered event
- Catches unexpected errors and marks call as failed
- Error reasons:
  - "Failed to create call participants"
  - "Failed to notify participants of call answer"
  - "Unexpected error while answering call"

##### `endCall()`
- Gracefully handles non-critical errors (updating participants, creating system message)
- Catches errors when publishing call_ended event
- Catches unexpected errors and marks call as failed
- Error reason: "Unexpected error while ending call"

##### `declineCall()`
- Gracefully handles non-critical errors (creating system message)
- Catches errors when publishing call_declined event
- Catches unexpected errors and marks call as failed
- Error reason: "Unexpected error while declining call"

##### `missedCall()`
- Gracefully handles non-critical errors (creating system message)
- Catches errors when publishing call_missed event
- Catches unexpected errors and marks call as failed
- Error reason: "Unexpected error while marking call as missed"

##### `handleSignal()`
- Catches errors when publishing signaling data
- Marks call as failed if signaling fails
- Catches unexpected errors and marks call as failed
- Error reasons:
  - "Failed to forward signaling data"
  - "Unexpected error while handling signal"

### 3. HTTP Error Codes

The existing `CallServiceError` class already provides appropriate HTTP status codes:

- **400 Bad Request:** Invalid input, validation errors
- **403 Forbidden:** Authorization errors (not a participant)
- **404 Not Found:** Call or conversation not found
- **409 Conflict:** User busy with another call
- **500 Internal Server Error:** Unexpected errors

All route handlers in `backend/src/routes/calls.ts` properly return these status codes.

### 4. Error Logging

All error handling includes comprehensive logging:
- Errors are logged to console with context
- Both expected (CallServiceError) and unexpected errors are logged
- Failed attempts to mark calls as failed are also logged

## Error Flow

```
1. Error occurs during call operation
   ↓
2. Error is caught and logged
   ↓
3. If call was created, markCallAsFailed() is called
   ↓
4. Call status updated to 'failed' in database
   ↓
5. Error reason recorded in error_reason column
   ↓
6. call_failed event published to all participants
   ↓
7. Appropriate HTTP error code returned to client
```

## Frontend Integration

Frontend applications should:

1. Subscribe to `call_failed` events via Supabase Realtime
2. Display error messages to users when calls fail
3. Clean up call state when receiving call_failed events
4. Handle HTTP error responses from call API endpoints

Example subscription:
```typescript
supabase
  .channel(`user:${userId}`)
  .on('broadcast', { event: 'call_failed' }, (payload) => {
    const { callId, conversationId, errorReason } = payload;
    // Handle call failure
    showErrorDialog(errorReason);
    cleanupCallState();
  })
  .subscribe();
```

## Database Schema

The `calls` table already includes the `error_reason` column:

```sql
error_reason TEXT
```

This column stores human-readable error messages when calls fail.

## Testing Recommendations

To test error handling:

1. **Network Failures:** Simulate Supabase Realtime connection failures
2. **Database Errors:** Test with database connection issues
3. **Invalid States:** Attempt operations on calls in invalid states
4. **Concurrent Operations:** Test race conditions with simultaneous call operations
5. **Participant Validation:** Test with invalid or offline participants

## Requirements Satisfied

This implementation satisfies Requirement 11.5 from the WebRTC requirements:

- ✅ CallService catches and logs errors during call operations
- ✅ Call status set to 'failed' when errors occur
- ✅ Error reason recorded in calls table
- ✅ Appropriate HTTP error codes returned (400, 404, 500, etc.)
- ✅ call_failed event published via Realtime

## Future Enhancements

Potential improvements:

1. **Retry Logic:** Implement automatic retry for transient failures
2. **Error Categories:** Categorize errors (network, validation, system)
3. **Metrics:** Track error rates and types for monitoring
4. **User-Friendly Messages:** Map technical errors to user-friendly messages
5. **Recovery Actions:** Suggest recovery actions based on error type
