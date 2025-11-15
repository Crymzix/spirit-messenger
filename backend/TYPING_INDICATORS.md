# Typing Indicators Implementation Guide

## Overview

Typing indicators in the MSN Messenger Clone use **Supabase Realtime Presence** feature to track when users are actively typing in a conversation. This provides real-time feedback without requiring database writes for every keystroke.

## Architecture

### Backend Service
The Backend Service does NOT handle typing indicators directly. Typing status is managed entirely through Supabase Realtime Presence on the frontend.

### Frontend Implementation
The frontend uses Supabase Realtime Presence channels to:
1. Broadcast typing status when a user is typing
2. Subscribe to typing status from other participants
3. Display "User is typing..." indicators in chat windows

## Supabase Realtime Presence

### What is Presence?
Presence is a Supabase Realtime feature that allows clients to share ephemeral state with each other. It's perfect for typing indicators because:
- No database writes required
- Automatic cleanup when users disconnect
- Real-time synchronization across all clients
- Built-in conflict resolution

### How It Works
1. Each conversation has a dedicated Realtime channel: `conversation:{conversationId}`
2. When a user starts typing, they broadcast their presence state with `isTyping: true`
3. Other participants in the channel receive the presence update
4. When a user stops typing (or sends a message), they update presence to `isTyping: false`
5. Presence automatically clears when the user disconnects

## Frontend Implementation

### 1. Create Typing Service

Create `messenger/src/lib/services/typing-service.ts`:

```typescript
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface TypingUser {
  userId: string;
  username: string;
  isTyping: boolean;
  lastTypingAt: number;
}

export class TypingService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly TYPING_TIMEOUT = 3000; // 3 seconds

  /**
   * Subscribe to typing indicators for a conversation
   */
  subscribeToTyping(
    conversationId: string,
    currentUserId: string,
    onTypingChange: (typingUsers: TypingUser[]) => void
  ): () => void {
    // Create or get existing channel
    const channelName = `conversation:${conversationId}`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      channel = supabase.channel(channelName, {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      });

      // Track presence state
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState();
          const typingUsers = this.extractTypingUsers(state, currentUserId);
          onTypingChange(typingUsers);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Initialize presence as not typing
            await channel!.track({
              userId: currentUserId,
              isTyping: false,
              lastTypingAt: Date.now(),
            });
          }
        });

      this.channels.set(channelName, channel);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribeFromTyping(conversationId);
    };
  }

  /**
   * Broadcast typing status
   */
  async setTyping(
    conversationId: string,
    currentUserId: string,
    isTyping: boolean
  ): Promise<void> {
    const channelName = `conversation:${conversationId}`;
    const channel = this.channels.get(channelName);

    if (!channel) {
      console.warn('Channel not found for conversation:', conversationId);
      return;
    }

    // Update presence
    await channel.track({
      userId: currentUserId,
      isTyping,
      lastTypingAt: Date.now(),
    });

    // If typing, set timeout to auto-clear after 3 seconds
    if (isTyping) {
      const timeoutKey = `${conversationId}:${currentUserId}`;
      
      // Clear existing timeout
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        this.setTyping(conversationId, currentUserId, false);
        this.typingTimeouts.delete(timeoutKey);
      }, this.TYPING_TIMEOUT);

      this.typingTimeouts.set(timeoutKey, timeout);
    }
  }

  /**
   * Unsubscribe from typing indicators
   */
  unsubscribeFromTyping(conversationId: string): void {
    const channelName = `conversation:${conversationId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }

    // Clear any pending timeouts for this conversation
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      if (key.startsWith(`${conversationId}:`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }
  }

  /**
   * Extract typing users from presence state
   */
  private extractTypingUsers(
    state: Record<string, any[]>,
    currentUserId: string
  ): TypingUser[] {
    const typingUsers: TypingUser[] = [];

    for (const userId in state) {
      const presences = state[userId];
      if (presences && presences.length > 0) {
        const presence = presences[0]; // Get most recent presence
        
        // Exclude current user and only include actively typing users
        if (presence.userId !== currentUserId && presence.isTyping) {
          typingUsers.push({
            userId: presence.userId,
            username: presence.username || 'Unknown',
            isTyping: presence.isTyping,
            lastTypingAt: presence.lastTypingAt,
          });
        }
      }
    }

    return typingUsers;
  }

  /**
   * Clean up all channels and timeouts
   */
  cleanup(): void {
    // Unsubscribe from all channels
    for (const [conversationId] of this.channels) {
      this.unsubscribeFromTyping(conversationId);
    }

    // Clear all timeouts
    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();
  }
}

// Export singleton instance
export const typingService = new TypingService();
```

### 2. Create Typing Indicator Hook

Create `messenger/src/lib/hooks/typing-hooks.ts`:

```typescript
import { useEffect, useState, useCallback } from 'react';
import { typingService, TypingUser } from '../services/typing-service';
import { useAuthStore } from '../store/auth-store';

/**
 * Hook to manage typing indicators for a conversation
 */
export function useTypingIndicator(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const currentUser = useAuthStore((state) => state.user);

  // Subscribe to typing updates
  useEffect(() => {
    if (!conversationId || !currentUser) {
      return;
    }

    const unsubscribe = typingService.subscribeToTyping(
      conversationId,
      currentUser.id,
      (users) => {
        setTypingUsers(users);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId, currentUser]);

  // Function to set typing status
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId || !currentUser) {
        return;
      }

      await typingService.setTyping(conversationId, currentUser.id, isTyping);
    },
    [conversationId, currentUser]
  );

  return {
    typingUsers,
    setTyping,
  };
}
```

### 3. Use in Chat Window Component

Example usage in `messenger/src/components/windows/chat-window.tsx`:

```typescript
import { useTypingIndicator } from '../../lib/hooks/typing-hooks';

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const { typingUsers, setTyping } = useTypingIndicator(conversationId);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    // Set typing status
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      setTyping(true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
      setTyping(false);
    }
  };

  // Handle message send
  const handleSendMessage = async () => {
    if (messageInput.trim().length === 0) return;

    // Clear typing status before sending
    setTyping(false);
    setIsTyping(false);

    // Send message logic here...
    
    setMessageInput('');
  };

  return (
    <div className="chat-window">
      {/* Message history */}
      <div className="message-history">
        {/* Messages */}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.length === 1 ? (
            <span>{typingUsers[0].username} is typing...</span>
          ) : typingUsers.length === 2 ? (
            <span>
              {typingUsers[0].username} and {typingUsers[1].username} are typing...
            </span>
          ) : (
            <span>Multiple people are typing...</span>
          )}
        </div>
      )}

      {/* Message input */}
      <div className="message-input">
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}
```

### 4. Typing Indicator Component

Create `messenger/src/components/typing-indicator.tsx`:

```typescript
interface TypingIndicatorProps {
  usernames: string[];
}

export function TypingIndicator({ usernames }: TypingIndicatorProps) {
  if (usernames.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (usernames.length === 1) {
      return `${usernames[0]} is typing...`;
    } else if (usernames.length === 2) {
      return `${usernames[0]} and ${usernames[1]} are typing...`;
    } else {
      return 'Multiple people are typing...';
    }
  };

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
      <span className="typing-text">{getTypingText()}</span>
    </div>
  );
}
```

### 5. Styling (TailwindCSS)

Add to your CSS file:

```css
.typing-indicator {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 10px;
  color: #666;
  font-style: italic;
}

.typing-dots {
  display: flex;
  gap: 4px;
  margin-right: 8px;
}

.typing-dots .dot {
  width: 4px;
  height: 4px;
  background-color: #666;
  border-radius: 50%;
  animation: typing-pulse 1.4s infinite;
}

.typing-dots .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing-pulse {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}
```

## Best Practices

### 1. Debounce Typing Events
Don't send typing status on every keystroke. Use a debounce or throttle:

```typescript
import { debounce } from 'lodash';

const debouncedSetTyping = debounce((isTyping: boolean) => {
  setTyping(isTyping);
}, 300);
```

### 2. Auto-Clear Typing Status
Always clear typing status after 3 seconds of inactivity (already implemented in TypingService).

### 3. Clear on Message Send
Always clear typing status when a message is sent.

### 4. Handle Disconnections
Supabase Presence automatically clears presence when a user disconnects, so no manual cleanup is needed.

### 5. Performance Considerations
- Limit typing indicator updates to once every 300ms
- Only show typing indicators for active conversations
- Clean up subscriptions when components unmount

## Troubleshooting

### Typing indicators not showing
1. Verify Supabase Realtime is enabled in your project
2. Check that the channel name matches: `conversation:{conversationId}`
3. Ensure users are authenticated with Supabase
4. Check browser console for WebSocket connection errors

### Typing status not clearing
1. Verify the 3-second timeout is working
2. Ensure `setTyping(false)` is called when sending messages
3. Check that cleanup functions are called on unmount

### Multiple typing indicators for same user
1. Ensure only one channel subscription per conversation
2. Use the presence `key` parameter to identify unique users
3. Clean up old subscriptions before creating new ones

## Security Considerations

### Row Level Security (RLS)
Typing indicators use Supabase Realtime Presence, which operates at the channel level. Ensure:
1. Only conversation participants can join the channel
2. Implement channel authorization in Supabase

### Rate Limiting
Consider implementing rate limiting on the frontend to prevent abuse:
- Maximum 1 typing update per 300ms per user
- Maximum 10 typing updates per minute per conversation

## Testing

### Manual Testing
1. Open two browser windows with different users
2. Start typing in one window
3. Verify typing indicator appears in the other window
4. Stop typing and verify indicator disappears after 3 seconds
5. Send a message and verify indicator clears immediately

### Automated Testing
```typescript
describe('TypingService', () => {
  it('should broadcast typing status', async () => {
    const service = new TypingService();
    await service.setTyping('conv-123', 'user-456', true);
    // Assert presence was updated
  });

  it('should auto-clear typing after 3 seconds', async () => {
    const service = new TypingService();
    await service.setTyping('conv-123', 'user-456', true);
    await new Promise(resolve => setTimeout(resolve, 3100));
    // Assert typing was cleared
  });
});
```

## Future Enhancements

1. **Show typing position**: Display where in the message the user is typing
2. **Typing speed indicator**: Show fast/slow typing animation
3. **Voice typing indicator**: Different indicator for voice input
4. **Mobile optimization**: Reduce presence updates on mobile to save battery
5. **Analytics**: Track typing patterns for UX improvements

## References

- [Supabase Realtime Presence Documentation](https://supabase.com/docs/guides/realtime/presence)
- [MSN Messenger Clone Design Document](./design.md)
- [Requirements Document](./requirements.md)
