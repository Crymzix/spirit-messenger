# Send Message Implementation

## Overview
This document describes the implementation of task 24.3: "Implement send message functionality" from the MSN Messenger Clone specification.

## Implementation Details

### 1. Message Service (`messenger/src/lib/services/message-service.ts`)
Created a new service layer that handles all message-related API calls to the Backend Service:

**Functions:**
- `sendMessage(data)` - Sends a message to a conversation
- `createConversation(data)` - Creates a new conversation
- `getConversationMessages(conversationId, limit, beforeMessageId)` - Fetches messages for a conversation
- `getConversation(conversationId)` - Gets a specific conversation
- `getUserConversations()` - Gets all conversations for the current user
- `leaveConversation(conversationId)` - Leaves a conversation

**Key Features:**
- Uses the existing `api-client.ts` for HTTP requests
- Handles authentication tokens automatically
- Returns consistent response format with success/error handling
- Supports pagination for message history

### 2. Message Hooks (`messenger/src/lib/hooks/message-hooks.ts`)
Created React Query hooks that wrap the service functions:

**Hooks:**
- `useSendMessage(conversationId)` - Mutation hook for sending messages
- `useCreateConversation()` - Mutation hook for creating conversations
- `useConversationMessages(conversationId, limit, beforeMessageId)` - Query hook for fetching messages
- `useConversation(conversationId)` - Query hook for fetching a conversation
- `useConversations()` - Query hook for fetching all conversations
- `useLeaveConversation()` - Mutation hook for leaving a conversation

**Key Features:**
- **Optimistic Updates**: Messages appear instantly in the UI before server confirmation
- **Automatic Cache Management**: React Query handles caching and invalidation
- **Error Handling**: Automatic rollback on failure
- **Loading States**: Built-in loading and error states
- **Query Key Factory**: Consistent query key structure for cache management

### 3. Chat Window Integration (`messenger/src/components/windows/chat-window.tsx`)
Updated the chat window component to use the new React Query hooks:

**Changes:**
- Replaced local state management with `useSendMessage` hook
- Added `useConversationMessages` hook to fetch messages
- Integrated Supabase Realtime subscriptions for delivery confirmation
- Added loading states and error handling
- Disabled textarea while sending to prevent duplicate sends

**Real-time Flow:**
1. User types message and presses Enter
2. `useSendMessage` mutation is called
3. Optimistic update shows message immediately
4. Message is sent to Backend Service API
5. Backend persists message to Supabase database
6. Supabase Realtime broadcasts INSERT event
7. Frontend receives event and confirms delivery
8. React Query refetches to get the real message with server-generated ID

## Architecture Compliance

### Requirements Met:
- ✅ **Requirement 4.2**: Messages are sent to Backend Service API within 1 second
- ✅ **Requirement 17.1**: All TypeScript files use kebab-case naming
- ✅ **Requirement 17.3**: Components use React Query hooks, not direct service calls
- ✅ **Requirement 18.2**: Custom hooks wrap service calls with React Query
- ✅ **Requirement 18.3**: Components use hooks, never call services directly
- ✅ **Requirement 18.4**: Mutations use useMutation wrapper
- ✅ **Requirement 18.7**: Queries are invalidated on successful mutations
- ✅ **Requirement 18.8**: Optimistic updates provide instant UI feedback

### Design Pattern:
```
Component → React Query Hook → Service Layer → Backend API
                ↓
         Cache Management
         Loading States
         Error Handling
         Optimistic Updates
```

## API Endpoints Used

### POST /api/messages
Sends a new message to a conversation.

**Request:**
```json
{
  "conversationId": "uuid",
  "content": "message text",
  "messageType": "text",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": { /* Message object */ }
  }
}
```

### GET /api/messages/conversations/:conversationId/messages
Fetches messages for a conversation with pagination.

**Query Parameters:**
- `limit` (optional): Number of messages to fetch (default: 50)
- `beforeMessageId` (optional): Fetch messages before this message ID

## Testing

The implementation can be tested by:
1. Starting the backend service (already running on port 1056)
2. Starting the frontend application
3. Opening a chat window with a contact
4. Typing and sending messages
5. Observing:
   - Messages appear instantly (optimistic update)
   - Messages persist after page refresh
   - Real-time delivery confirmation
   - Error handling if backend is unavailable

## Future Enhancements

Potential improvements for future tasks:
- Add typing indicators (using Supabase Realtime Presence)
- Implement message read receipts
- Add support for emoticons and rich text formatting
- Implement file attachments
- Add message search functionality
- Implement message editing and deletion

## Files Modified/Created

**Created:**
- `messenger/src/lib/services/message-service.ts`
- `messenger/src/lib/hooks/message-hooks.ts`

**Modified:**
- `messenger/src/components/windows/chat-window.tsx`

## Dependencies

All required dependencies are already installed:
- `@tanstack/react-query` - React Query for state management
- `@supabase/supabase-js` - Supabase client for real-time subscriptions

## Conclusion

The send message functionality has been successfully implemented following the React Query architecture pattern specified in the design document. The implementation provides instant UI feedback through optimistic updates while ensuring data consistency through proper cache invalidation and real-time subscriptions.
