# Conversation Participants with Contact ID

## Overview
The `POST /api/conversations` endpoint now returns the `contactId` for each participant in the conversation's participants array. This allows the frontend to easily access contact-specific information without additional lookups.

## Implementation

### Backend Changes

#### Message Service (`backend/src/services/message-service.ts`)
- Added `ParticipantWithContactId` interface that extends `SelectUser` with optional `contactId`
- Updated `ConversationWithParticipants` to use `ParticipantWithContactId[]` instead of `SelectUser[]`
- Modified `createConversation()` to fetch contact IDs for each participant
- Contact ID is fetched from the `contacts` table based on the relationship between the current user and each participant

#### Logic
Uses a single SQL query with LEFT JOIN for optimal performance:
```typescript
const participantsQuery = await db
  .select({
    // ... all user fields
    contactId: contacts.id,
  })
  .from(users)
  .leftJoin(
    contacts,
    and(
      eq(contacts.userId, userId),        // Current user's ID
      eq(contacts.contactUserId, users.id) // Participant's user ID
    )
  )
  .where(inArray(users.id, allParticipantIds));

// Map null to undefined for TypeScript compatibility
const participantsWithContactIds = participantsQuery.map(p => ({
  ...p,
  contactId: p.contactId ?? undefined,
}));
```

**Benefits of JOIN approach:**
- Single database query instead of N+1 queries
- Better performance, especially with many participants
- Reduced database load
- Atomic operation

### Frontend Changes

#### Types (`messenger/src/types/index.ts`)
- Added optional `contactId?: string` field to `User` interface
- This field is populated when the user is a participant in a conversation

## Response Format

### Before
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv-123",
      "type": "one_on_one",
      "participants": [
        {
          "id": "user-456",
          "username": "john_doe",
          "displayName": "John Doe"
          // ... other user fields
        }
      ]
    }
  }
}
```

### After
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv-123",
      "type": "one_on_one",
      "participants": [
        {
          "id": "user-456",
          "username": "john_doe",
          "displayName": "John Doe",
          "contactId": "contact-789"  // ← Now included
          // ... other user fields
        }
      ]
    }
  }
}
```

## Use Cases

### 1. Direct Contact Access
Frontend can now directly access contact-specific data without additional API calls:
```typescript
const conversation = await createConversation(userId, data);
const participant = conversation.participants[0];

// Can now use contactId directly
if (participant.contactId) {
  // Access contact-specific features
  // - Contact groups
  // - Block/unblock
  // - Contact settings
}
```

### 2. Contact Management
Easier to manage contacts within conversation context:
```typescript
// Remove contact from conversation
const contactId = participant.contactId;
if (contactId) {
  await removeContact(contactId);
}
```

### 3. Group Conversations
For group conversations, each participant has their contact ID:
```typescript
conversation.participants.forEach(participant => {
  if (participant.contactId) {
    console.log(`Contact ID for ${participant.displayName}: ${participant.contactId}`);
  }
});
```

## Notes

- The `contactId` is **optional** because:
  - The current user doesn't have a contact ID for themselves
  - In rare cases, a participant might not be in the user's contact list
- The contact ID is from the **current user's perspective** (their relationship with each participant)
- For existing conversations, the contact ID is also included when returning the conversation

## Related Files

### Backend
- `backend/src/services/message-service.ts` - Contact ID fetching logic
- `backend/src/routes/messages.ts` - POST /api/conversations endpoint
- `backend/src/db/schema.ts` - Contacts table schema

### Frontend
- `messenger/src/types/index.ts` - User interface with contactId
- `messenger/src/lib/hooks/conversation-hooks.ts` - Conversation hooks
