# Chat History Pagination Implementation

## Overview
Implemented chat history loading with pagination support for the MSN Messenger clone. Messages are loaded in pages of 50, with a "Load More" button to fetch older messages.

## Implementation Details

### Frontend Changes

#### 1. Message Hooks (`messenger/src/lib/hooks/message-hooks.ts`)
- Added `useInfiniteQuery` import from React Query
- Created new `useConversationMessagesInfinite()` hook for paginated message loading
- Implements infinite scroll pattern with cursor-based pagination
- Uses `beforeMessageId` as the cursor to fetch older messages
- Returns messages in chronological order (oldest to newest)
- Updated `useSendMessage()` to support both regular and infinite queries with optimistic updates
- Updated `useConversationRealtimeUpdates()` to invalidate both query types

#### 2. Chat Window Component (`messenger/src/components/windows/chat-window.tsx`)
- Replaced `useConversationMessages()` with `useConversationMessagesInfinite()`
- Added "Load More Messages" button at the top of the message history
- Button is only shown when `hasNextPage` is true
- Shows loading state while fetching next page
- Messages are displayed in chronological order (oldest to newest)
- Maintains scroll position when loading more messages

### Backend Changes

#### 1. Message Service (`backend/src/services/message-service.ts`)
- Fixed `getConversationMessages()` to properly implement cursor-based pagination
- Added `lt` (less than) operator import from drizzle-orm
- When `beforeMessageId` is provided:
  - Fetches the reference message by ID
  - Filters messages with `createdAt < reference.createdAt`
  - Returns messages in reverse chronological order (newest first)
- Validates that `beforeMessage.createdAt` exists before filtering

## How It Works

### Initial Load
1. Chat window opens
2. `useConversationMessagesInfinite()` fetches the first 50 messages
3. Messages are displayed in chronological order (oldest to newest)
4. If 50 messages are returned, "Load More" button appears

### Loading More Messages
1. User clicks "Load More Messages" button
2. `fetchNextPage()` is called with the oldest message ID as cursor
3. Backend fetches the next 50 messages older than the cursor
4. New messages are prepended to the existing list
5. If fewer than 50 messages are returned, "Load More" button disappears

### Real-time Updates
- New messages are received via Supabase Realtime subscriptions
- React Query cache is invalidated when new messages arrive
- Optimistic updates show sent messages immediately
- Messages are automatically refetched to get complete data with sender info

## Query Key Structure
```typescript
// Regular query (not used in chat window anymore)
['messages', 'conversation', conversationId]

// Infinite query (used in chat window)
['messages', 'conversation', conversationId, 'infinite']
```

## Pagination Flow
```
Page 1: Messages 1-50 (newest)
  ↓ Click "Load More"
Page 2: Messages 51-100 (older)
  ↓ Click "Load More"
Page 3: Messages 101-150 (even older)
  ↓ No more messages
Button disappears
```

## Benefits
1. **Performance**: Only loads messages as needed, reducing initial load time
2. **Memory Efficient**: Doesn't load entire conversation history at once
3. **User Experience**: Smooth loading with clear feedback
4. **Scalability**: Handles conversations with thousands of messages
5. **Real-time**: Works seamlessly with live message updates

## Testing Recommendations
1. Test with conversations containing 0, 25, 50, 75, 100+ messages
2. Verify "Load More" button appears/disappears correctly
3. Test sending messages while viewing older messages
4. Verify scroll position is maintained when loading more
5. Test real-time message reception during pagination
6. Verify optimistic updates work correctly

## Requirements Satisfied
- ✅ Fetch previous messages from Supabase on chat open
- ✅ Implement pagination (50 messages per page)
- ✅ Add "Load More" functionality for older messages
- ✅ Display messages in chronological order
- ✅ Use React Query and Hooks
- ✅ Requirement 4.5: Chat history loading
