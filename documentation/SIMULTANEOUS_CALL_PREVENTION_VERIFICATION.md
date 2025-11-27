# Simultaneous Call Prevention - Implementation Verification

## Task 32: Backend Simultaneous Call Prevention

### Requirements Verification

#### Requirement 13.1: Check for existing calls
✅ **IMPLEMENTED** in `backend/src/services/call-service.ts` (lines 219-237)

The `initiateCall` function checks for existing active or ringing calls:

```typescript
// Check if either user has an existing active or ringing call
const existingCalls = await db
    .select()
    .from(calls)
    .innerJoin(
        conversationParticipants,
        eq(conversationParticipants.conversationId, calls.conversationId)
    )
    .where(
        and(
            or(
                eq(conversationParticipants.userId, userId),
                eq(conversationParticipants.userId, otherParticipant.userId)
            ),
            or(
                eq(calls.status, 'ringing'),
                eq(calls.status, 'active')
            )
        )
    );
```

#### Requirement 13.2: Return 409 Conflict status
✅ **IMPLEMENTED** in `backend/src/services/call-service.ts` (lines 238-243)

```typescript
if (existingCalls.length > 0) {
    throw new CallServiceError(
        'User is currently on another call',
        'USER_BUSY',
        409
    );
}
```

The error is properly caught and returned in `backend/src/routes/calls.ts` (lines 90-94):

```typescript
if (error instanceof CallServiceError) {
    return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
    });
}
```

#### Requirement 13.3: Error message
✅ **IMPLEMENTED** - Error message is "User is currently on another call"

### Implementation Details

The simultaneous call prevention works as follows:

1. **When a user initiates a call**, the `initiateCall` function:
   - Identifies both participants (initiator and recipient)
   - Queries the database for any existing calls where:
     - Either participant is involved (initiator OR recipient)
     - The call status is 'ringing' OR 'active'
   
2. **If an existing call is found**:
   - Throws a `CallServiceError` with:
     - Message: "User is currently on another call"
     - Code: "USER_BUSY"
     - Status Code: 409 (Conflict)

3. **The API route handler**:
   - Catches the `CallServiceError`
   - Returns HTTP 409 status with the error message
   - Frontend receives the error and can display it to the user

### Test Scenarios

To manually verify this implementation:

#### Scenario 1: User A calls User B while User B is already on a call
1. User B starts a call with User C (call status: 'active')
2. User A attempts to call User B
3. **Expected Result**: API returns 409 with "User is currently on another call"

#### Scenario 2: User A calls User B while User A is already on a call
1. User A starts a call with User C (call status: 'active')
2. User A attempts to call User B
3. **Expected Result**: API returns 409 with "User is currently on another call"

#### Scenario 3: User A calls User B while User B has a ringing call
1. User C calls User B (call status: 'ringing')
2. User A attempts to call User B
3. **Expected Result**: API returns 409 with "User is currently on another call"

#### Scenario 4: User A calls User B when both are free
1. Neither User A nor User B has any active or ringing calls
2. User A attempts to call User B
3. **Expected Result**: Call is successfully initiated (status 201)

### Database Query Explanation

The query uses an INNER JOIN to find all calls where:
- The call's conversation includes either the initiator or the recipient as a participant
- The call status is either 'ringing' or 'active'

This ensures that:
- Both users are checked for existing calls
- Only active or ringing calls block new calls (ended/declined/missed calls don't block)
- The check works across all conversations, not just the current one

### API Response Examples

**Success (no existing calls):**
```json
{
  "success": true,
  "data": {
    "call": {
      "id": "uuid",
      "conversationId": "uuid",
      "initiatorId": "uuid",
      "callType": "voice",
      "status": "ringing",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**Failure (user busy):**
```json
{
  "success": false,
  "error": "User is currently on another call"
}
```
HTTP Status: 409 Conflict

## Conclusion

Task 32 is **COMPLETE**. The implementation:
- ✅ Checks for existing active or ringing calls for both users
- ✅ Returns 409 Conflict status when a user is busy
- ✅ Includes the required error message
- ✅ Properly propagates the error through the API layer
- ✅ Meets all requirements (13.1, 13.2, 13.3)
