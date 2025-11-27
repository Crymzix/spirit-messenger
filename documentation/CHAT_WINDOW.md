# Chat Window Component

## Overview

The `ChatWindow` component is a fully-featured chat interface that replicates the classic MSN Messenger 7.5 chat window design. It supports both one-on-one and group conversations with a nostalgic UI.

## Features

### ✅ Implemented

1. **Title Bar**
   - Displays conversation name (contact name for one-on-one, group name for groups)
   - Close button with hover effects
   - Classic MSN blue gradient styling

2. **Menu Bar**
   - File, Edit, Actions, Tools, Help menus
   - Classic MSN styling with hover effects

3. **Message History Panel**
   - Scrollable message area
   - Auto-scroll to bottom on new messages
   - Displays sender name with color coding (red for current user, blue for others)
   - Timestamp for each message
   - Empty state message

4. **Toolbar**
   - Emoticon picker button
   - Text formatting buttons (Bold, Italic, Font Color)
   - File attachment button
   - Classic MSN button styling

5. **Emoticon Picker**
   - Popup grid with 12 common emoticons
   - Click to insert into message
   - Positioned above composition area

6. **Message Composition Area**
   - Multi-line textarea for message input
   - Enter to send, Shift+Enter for new line
   - Send button with disabled state
   - Character input handling

7. **Participant List (Group Chats)**
   - Shows all participants with display pictures
   - Presence status indicators (online, away, busy, offline)
   - Participant count
   - Only visible for group conversations

8. **Classic MSN Styling**
   - MSN color palette (blue #0066CC, light blue #E6F2FF, etc.)
   - Tahoma font family
   - Proper spacing and layout matching MSN 7.5
   - Window chrome with gradient title bar

## Component API

### Props

```typescript
interface ChatWindowProps {
  conversation: {
    id: string;
    type: 'one_on_one' | 'group';
    name?: string;
    participants: User[];
  };
  currentUserId: string;
  onClose: () => void;
}
```

### Usage Example

```tsx
import { ChatWindow } from '@/components/windows/chat-window';

function App() {
  const conversation = {
    id: "conv-123",
    type: 'one_on_one',
    participants: [currentUser, contactUser],
  };

  return (
    <ChatWindow
      conversation={conversation}
      currentUserId={currentUser.id}
      onClose={() => console.log('Window closed')}
    />
  );
}
```

## Testing

A demo page is available at `chat-window.html` with sample data:

```bash
cd messenger
npm run dev
# Open http://localhost:1420/chat-window.html
```

## Next Steps (Future Tasks)

The following features are planned for future implementation:

1. **React Query Integration** (Task 24.3)
   - Connect to message service via React Query hooks
   - Real-time message synchronization with Supabase
   - Optimistic updates for sent messages

2. **Message Bubbles** (Task 30.2)
   - Separate MessageBubble component
   - Different styles for sent/received messages
   - Delivery status indicators

3. **Typing Indicators** (Task 15.6)
   - Show "Contact is typing..." indicator
   - Supabase Realtime presence integration

4. **Chat History Loading** (Task 24.5)
   - Fetch previous messages from Supabase
   - Pagination with "Load More" functionality
   - Scroll position management

5. **Emoticon System** (Task 16)
   - Full emoticon library (30+ classic MSN emoticons)
   - Emoticon rendering in messages
   - Shortcut conversion (`:)` → 😊)

6. **Rich Text Formatting** (Task 16)
   - Bold, italic, color formatting
   - Format preservation in messages
   - Formatting toolbar functionality

7. **File Transfer UI** (Task 20)
   - File selection and upload
   - Progress indicators
   - File transfer notifications

## File Structure

```
messenger/src/
├── components/
│   └── windows/
│       └── chat-window.tsx          # Main chat window component
├── chat-window-entry.tsx            # Demo entry point
└── types/
    └── index.ts                     # Type definitions

messenger/
└── chat-window.html                 # Demo HTML page
```

## Design Specifications

### Colors
- Primary Blue: `#0066CC`
- Light Blue: `#E6F2FF`
- Window Background: `#ECE9D8`
- Online Green: `#00CC00`
- Away Orange: `#FF9900`
- Busy Red: `#CC0000`

### Typography
- Font Family: Tahoma, Arial, sans-serif
- Display Name: 11px bold
- Chat Messages: 10px regular
- Timestamps: 9px regular

### Layout
- Chat Window: 500px × 400px (resizable)
- Message Bubble Padding: 8px 12px
- Window Padding: 8px

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 4.1**: Chat Session window with message history
- **Requirement 11.4**: Classic MSN Messenger chat window layout
- **Requirement 17.1**: Kebab-case file naming (chat-window.tsx)
- **Requirement 17.3**: TypeScript implementation with proper types

## Notes

- The component currently uses local state for messages (demo purposes)
- Message sending and receiving will be implemented in future tasks via React Query hooks
- Real-time synchronization with Supabase will be added in subsequent tasks
- The emoticon picker uses Unicode emojis as placeholders for classic MSN emoticons
