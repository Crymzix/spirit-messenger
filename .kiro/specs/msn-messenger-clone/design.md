# Design Document: MSN Messenger Clone

## Overview

The MSN Messenger Clone is a cross-platform desktop application built with Tauri (Rust backend), React (frontend), TailwindCSS (styling), a separate Backend Service for write operations, and Supabase for real-time data subscriptions. The application replicates the classic MSN Messenger 7.5 experience while leveraging modern technologies for real-time communication, authentication, and data persistence.

The architecture follows a clear separation of concerns:
- **Write Operations**: All data mutations (authentication, sending messages, updating profiles) go through the Backend Service
- **Read Operations**: The frontend reads directly from Supabase for optimal real-time performance
- **Real-time Updates**: Supabase Realtime provides WebSocket-based subscriptions for instant updates

### Technology Stack

- **Frontend**: React 18+ with Vite, TailwindCSS 3+
- **Desktop Framework**: Tauri 2.x (Rust)
- **Backend Service**: Node.js with Fastify (high-performance web framework)
- **ORM**: Drizzle ORM (type-safe database operations)
- **Authentication**: Supabase Auth (user management and JWT tokens)
- **Database**: Supabase PostgreSQL with Realtime subscriptions
- **Storage**: Supabase Storage (accessed via Backend Service for uploads)
- **AI Integration**: OpenRouter API for multi-LLM access (via Backend Service)
- **State Management**: Zustand or React Context
- **Real-time Communication**: Supabase Realtime (WebSocket-based) for reads

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Desktop Application (Tauri)"
        UI[React UI Layer]
        Rust[Rust Core Layer]
        UI <--> Rust
    end
    
    subgraph "Backend Service"
        API[REST API]
        AuthLogic[Auth Logic]
        BizLogic[Business Logic]
        FileHandler[File Handler]
        AIHandler[AI Handler]
    end
    
    subgraph "Supabase"
        DB[(PostgreSQL Database)]
        Realtime[Realtime Engine]
        Storage[Storage Buckets]
    end
    
    subgraph "External Services"
        AI[AI Service API]
    end
    
    UI -->|Write Operations| API
    UI -->|Read Subscriptions| Realtime
    UI -->|Read Queries| DB
    API --> DB
    API --> Storage
    API --> AI
    Realtime -.->|Push Updates| UI
    
    style API fill:#4CAF50
    style Realtime fill:#2196F3
    style DB fill:#2196F3
```

### Application Layers

1. **Presentation Layer (React + TailwindCSS)**
   - React components replicating MSN Messenger UI
   - State management for UI interactions
   - Real-time updates via Supabase subscriptions (reads only)
   - HTTP client for Backend Service API calls (writes only)

2. **Application Layer (Tauri Rust)**
   - Native system integrations (notifications, file system, system tray)
   - Local file handling
   - Local storage and caching
   - Window management

3. **Backend Service Layer (Node.js/Express)**
   - RESTful API endpoints for all write operations
   - Authentication and authorization
   - Business logic validation
   - File upload handling to Supabase Storage
   - AI chatbot integration
   - Database write operations

4. **Data Layer (Supabase)**
   - PostgreSQL database for data persistence
   - Real-time subscriptions for instant updates
   - Storage buckets for files and images
   - Row Level Security for data access control

5. **AI Layer (External API)**
   - Chatbot conversation handling (accessed via Backend Service)
   - Response generation

## Components and Interfaces

### Frontend Components

#### 1. Authentication Components

**SignInWindow**
- Email/password input fields
- "Remember me" checkbox
- Sign-in button
- Link to registration

**RegistrationWindow**
- Username, email, password fields
- Password confirmation
- Terms acceptance checkbox
- Register button

#### 2. Main Application Components

**MainWindow**
- Top bar with user profile (display picture, name, status)
- Contact list panel
- Menu bar (File, Contacts, Actions, Tools, Help)
- Status selector dropdown
- Search bar

**ContactList**
- Grouped contacts (Online, Offline, Blocked)
- Contact items showing:
  - Display picture
  - Display name
  - Personal message
  - Presence status icon
- Right-click context menu
- Drag-and-drop for grouping

**ContactItem**
- Display picture (96x96px, circular)
- Name and status text
- Presence indicator (colored dot)
- Hover effects

#### 3. Chat Components

**ChatWindow**
- Window title with contact name
- Message history panel (scrollable)
- Message composition area
- Toolbar (emoticons, formatting, file transfer)
- Participant list (for group chats)
- Typing indicator

**MessageBubble**
- Sender identification
- Timestamp
- Message content (text, emoticons, formatted text)
- Delivery status indicator

**EmoticonPicker**
- Grid of emoticon images
- Search/filter functionality
- Recently used section

#### 4. AI Bot Components

**AI Bots in Contact List**
- AI Bots appear as regular contacts with special badge/icon
- Display AI Bot personality name and status
- Same interaction pattern as human contacts

**AI Bot Indicator**
- Visual badge or icon to distinguish AI Bots from human users
- Shown in contact list and chat windows
- Response loading indicator during AI message generation

#### 5. Settings Components

**SettingsWindow**
- Tabbed interface:
  - General (startup, notifications)
  - Privacy (status visibility, blocking)
  - Sounds (notification sounds, volume)
  - Files (download location)
  - Profile (display picture, personal info)

### Backend Schema (Supabase PostgreSQL)

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  personal_message TEXT,
  display_picture_url TEXT,
  presence_status TEXT DEFAULT 'offline',
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Contacts Table
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, blocked
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, file, system
  metadata JSONB, -- for emoticons, formatting, file info
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

#### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- one_on_one, group
  name TEXT, -- for group chats
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Conversation Participants Table
```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);
```

#### AI Bot Users Table Extension
```sql
-- AI Bots are stored in the users table with a special flag
-- Add a column to identify AI bot accounts
ALTER TABLE users ADD COLUMN is_ai_bot BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN ai_bot_personality TEXT; -- personality identifier for AI bots

-- Example AI bot users:
-- INSERT INTO users (email, username, display_name, is_ai_bot, ai_bot_personality, presence_status)
-- VALUES 
--   ('friendly-assistant@aibot.local', 'FriendlyAssistant', 'Friendly Assistant', TRUE, 'friendly_assistant', 'online'),
--   ('casual-friend@aibot.local', 'CasualFriend', 'Casual Friend', TRUE, 'casual_friend', 'online'),
--   ('creative-companion@aibot.local', 'CreativeCompanion', 'Creative Companion', TRUE, 'creative_companion', 'online');
```

#### Files Table
```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tauri Commands (Rust Backend)

```rust
// System integration commands
#[tauri::command]
async fn show_notification(title: String, body: String) -> Result<(), String>

#[tauri::command]
async fn play_sound(sound_type: String) -> Result<(), String>

#[tauri::command]
async fn save_file(file_data: Vec<u8>, filename: String) -> Result<String, String>

#[tauri::command]
async fn open_file_dialog() -> Result<String, String>

#[tauri::command]
async fn set_system_tray_status(status: String) -> Result<(), String>

#[tauri::command]
async fn get_app_data_dir() -> Result<String, String>

#[tauri::command]
async fn set_auto_launch(enabled: bool) -> Result<(), String>
```

### Backend Service API

#### Authentication Endpoints
```typescript
// POST /api/auth/register
{
  email: string,
  password: string,
  username: string,
  display_name: string
}
// Returns: { token: string, user: User }

// POST /api/auth/login
{
  email: string,
  password: string
}
// Returns: { token: string, user: User }

// POST /api/auth/logout
// Headers: Authorization: Bearer <token>
// Returns: { success: boolean }
```

#### User Endpoints
```typescript
// PUT /api/users/profile
// Headers: Authorization: Bearer <token>
{
  display_name?: string,
  personal_message?: string
}
// Returns: { user: User }

// POST /api/users/display-picture
// Headers: Authorization: Bearer <token>
// Body: FormData with image file
// Returns: { display_picture_url: string }

// PUT /api/users/presence
// Headers: Authorization: Bearer <token>
{
  presence_status: 'online' | 'away' | 'busy' | 'appear_offline'
}
// Returns: { success: boolean }
```

#### Contact Endpoints
```typescript
// POST /api/contacts/request
// Headers: Authorization: Bearer <token>
{
  contact_email: string
}
// Returns: { contact_request: ContactRequest }

// POST /api/contacts/accept
// Headers: Authorization: Bearer <token>
{
  request_id: string
}
// Returns: { contact: Contact }

// DELETE /api/contacts/:contactId
// Headers: Authorization: Bearer <token>
// Returns: { success: boolean }
```

#### Message Endpoints
```typescript
// POST /api/messages
// Headers: Authorization: Bearer <token>
{
  conversation_id: string,
  content: string,
  message_type: 'text' | 'file',
  metadata?: object
}
// Returns: { message: Message }

// POST /api/conversations
// Headers: Authorization: Bearer <token>
{
  type: 'one_on_one' | 'group',
  participant_ids: string[],
  name?: string
}
// Returns: { conversation: Conversation }

// POST /api/conversations/:conversationId/leave
// Headers: Authorization: Bearer <token>
// Returns: { success: boolean }
```

#### File Transfer Endpoints
```typescript
// POST /api/files/upload
// Headers: Authorization: Bearer <token>
// Body: FormData with file
{
  conversation_id: string,
  filename: string
}
// Returns: { file: File, message: Message }

// GET /api/files/:fileId/download
// Headers: Authorization: Bearer <token>
// Returns: File stream
```

#### AI Bot Endpoints
```typescript
// AI bots use the same message endpoints as regular users
// The Backend Service detects when a message is sent to an AI bot
// and automatically generates a response via OpenRouter

// GET /api/ai/bots
// Headers: Authorization: Bearer <token>
// Returns: { bots: User[] } - List of available AI bot users

// POST /api/ai/add-to-conversation
// Headers: Authorization: Bearer <token>
{
  conversation_id: string,
  bot_user_id: string
}
// Returns: { success: boolean, participant: ConversationParticipant }
```

### Supabase Client API (Read Operations Only)

#### Real-time Subscriptions
```typescript
// Subscribe to presence changes
const presenceChannel = supabase
  .channel('presence')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'users' },
    (payload) => handlePresenceChange(payload)
  )
  .subscribe()

// Subscribe to new messages
const messagesChannel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', 
      filter: `conversation_id=eq.${conversationId}` },
    (payload) => handleNewMessage(payload)
  )
  .subscribe()

// Subscribe to contact requests
const contactsChannel = supabase
  .channel('contacts')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'contacts',
      filter: `user_id=eq.${userId}` },
    (payload) => handleContactChange(payload)
  )
  .subscribe()
```

#### Database Read Operations
```typescript
// Get contacts
const { data, error } = await supabase
  .from('contacts')
  .select('*, contact_user:users!contact_user_id(*)')
  .eq('user_id', userId)
  .eq('status', 'accepted')

// Get messages
const { data, error } = await supabase
  .from('messages')
  .select('*, sender:users!sender_id(*)')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true })
  .limit(50)

// Get conversations
const { data, error } = await supabase
  .from('conversation_participants')
  .select('conversation:conversations(*)')
  .eq('user_id', userId)
  .is('left_at', null)

// Search messages
const { data, error } = await supabase
  .from('messages')
  .select('*, sender:users!sender_id(*)')
  .textSearch('content', searchQuery)
  .limit(50)
```

## Data Models

### TypeScript Interfaces

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  personalMessage: string;
  displayPictureUrl: string;
  presenceStatus: 'online' | 'away' | 'busy' | 'appear_offline' | 'offline';
  isAiBot: boolean;
  aiBotPersonality?: string; // Only present for AI bots
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Contact {
  id: string;
  userId: string;
  contactUser: User;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  messageType: 'text' | 'file' | 'system';
  metadata: {
    emoticons?: Array<{ position: number; code: string }>;
    formatting?: { bold?: boolean; italic?: boolean; color?: string };
    fileInfo?: { filename: string; size: number; mimeType: string };
  };
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

interface Conversation {
  id: string;
  type: 'one_on_one' | 'group';
  name?: string;
  participants: User[];
  lastMessage?: Message;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AIBotPersonality {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  systemPrompt: string;
  openRouterModel: string; // e.g., "anthropic/claude-3-haiku", "openai/gpt-3.5-turbo"
}

interface AppSettings {
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    soundVolume: number;
    desktopAlerts: boolean;
  };
  startup: {
    autoLaunch: boolean;
    startMinimized: boolean;
  };
  files: {
    downloadLocation: string;
    autoAcceptFrom: string[];
  };
}
```

## Error Handling

### Error Categories

1. **Network Errors**
   - Connection timeout
   - WebSocket disconnection
   - API request failures

2. **Authentication Errors**
   - Invalid credentials
   - Session expiration
   - Token refresh failures

3. **Validation Errors**
   - Invalid input data
   - File size/type restrictions
   - Message length limits

4. **System Errors**
   - File system access denied
   - Notification permission denied
   - Audio playback failures

### Error Handling Strategy

```typescript
// Centralized error handler
class ErrorHandler {
  static handle(error: AppError) {
    switch (error.category) {
      case 'network':
        return this.handleNetworkError(error);
      case 'auth':
        return this.handleAuthError(error);
      case 'validation':
        return this.handleValidationError(error);
      case 'system':
        return this.handleSystemError(error);
    }
  }

  static handleNetworkError(error: NetworkError) {
    // Show reconnection UI
    // Attempt automatic reconnection
    // Queue messages for retry
  }

  static handleAuthError(error: AuthError) {
    // Clear session
    // Redirect to sign-in
    // Show appropriate message
  }
}
```

### Retry Logic

```typescript
// Exponential backoff for WebSocket reconnection
const reconnectWithBackoff = async (attempt: number = 0) => {
  const maxAttempts = 10;
  const baseDelay = 1000;
  
  if (attempt >= maxAttempts) {
    showError('Unable to connect. Please check your internet connection.');
    return;
  }
  
  const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000);
  await sleep(delay);
  
  try {
    await establishConnection();
  } catch (error) {
    reconnectWithBackoff(attempt + 1);
  }
};
```

## Testing Strategy

### Unit Testing

**Frontend Components**
- Test component rendering with various props
- Test user interactions (clicks, inputs)
- Test state management logic
- Mock Supabase client calls

**Rust Commands**
- Test file system operations
- Test notification triggers
- Test system tray interactions
- Mock system APIs

### Integration Testing

**Authentication Flow**
- Test complete sign-up process
- Test sign-in with valid/invalid credentials
- Test session persistence
- Test sign-out

**Messaging Flow**
- Test sending messages between users
- Test real-time message delivery
- Test message persistence
- Test typing indicators

**Contact Management**
- Test adding contacts
- Test accepting/declining requests
- Test removing contacts
- Test blocking users

### End-to-End Testing

**Critical User Journeys**
1. New user registration → Add contacts → Send first message
2. Sign in → Receive message → Reply → Send file
3. Change presence status → Start group chat → Leave conversation
4. Chat with AI chatbot → Search chat history

**Tools**
- Playwright or Cypress for E2E tests
- Mock Supabase backend for consistent test environment

### Performance Testing

**Metrics to Monitor**
- Message delivery latency (target: <1 second)
- UI responsiveness (target: 60 FPS)
- Memory usage (target: <200 MB idle)
- Application startup time (target: <3 seconds)

**Load Testing**
- Test with 100+ contacts
- Test with 1000+ messages in history
- Test concurrent file transfers
- Test WebSocket connection stability

## UI/UX Design Specifications

### Classic MSN Messenger Visual Elements

**Color Palette**
- Primary Blue: #0066CC
- Light Blue: #E6F2FF
- Window Background: #ECE9D8 (Windows XP theme)
- Text Primary: #000000
- Text Secondary: #666666
- Online Green: #00CC00
- Away Orange: #FF9900
- Busy Red: #CC0000

**Typography**
- Primary Font: Tahoma, Arial, sans-serif
- Font Sizes:
  - Display Name: 11px bold
  - Personal Message: 9px regular
  - Chat Messages: 10px regular
  - Menu Items: 11px regular

**Window Dimensions**
- Main Window: 250px width × 600px height (resizable)
- Chat Window: 500px width × 400px height (resizable)
- Minimum Window Size: 200px × 300px

**Spacing and Layout**
- Contact Item Height: 52px
- Contact Item Padding: 8px
- Message Bubble Padding: 8px 12px
- Window Padding: 8px

### Emoticon System

**Classic MSN Emoticons**
- Implement 30+ classic emoticons (smile, wink, tongue, etc.)
- Emoticon size: 19×19 pixels
- Shortcut mapping (e.g., `:)` → smile, `;)` → wink)
- Animated GIF support for special emoticons

### Animations and Transitions

- Contact status change: Fade transition (200ms)
- Window open/close: Slide animation (150ms)
- Message send: Fade-in (100ms)
- Typing indicator: Pulsing animation (1s loop)

## Security Considerations

### Authentication Security
- Passwords hashed by Supabase Auth (bcrypt)
- JWT tokens for session management (generated by Supabase Auth)
- Token expiration and refresh logic handled by Supabase
- Secure token storage in Tauri's secure storage
- Backend Service validates all tokens using Supabase Auth before processing requests

### Data Privacy
- All write operations authenticated through Backend Service
- Backend Service uses Supabase service role key (not exposed to frontend)
- Frontend uses anon key only for read operations
- Secure WebSocket connections (WSS) for Supabase Realtime
- User data isolation via Row Level Security (RLS) in Supabase for read operations

### Supabase RLS Policies

Since the frontend only performs read operations, RLS policies focus on read access:

```sql
-- Users can read their own profile and profiles of their contacts
CREATE POLICY "Users can view profiles"
  ON users FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM contacts
      WHERE (user_id = auth.uid() AND contact_user_id = users.id)
         OR (contact_user_id = auth.uid() AND user_id = users.id)
      AND status = 'accepted'
    )
  );

-- Users can see their own contacts
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (user_id = auth.uid() OR contact_user_id = auth.uid());

-- Users can only see messages in their conversations
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
      AND left_at IS NULL
    )
  );

-- Users can see conversations they're part of
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

-- Users can see conversation participants for their conversations
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Note: All INSERT, UPDATE, DELETE operations are disabled for frontend
-- These operations are only performed by Backend Service using service role key
```

### Backend Service Security

```typescript
// Input validation with Fastify schema
const messageSchema = {
  body: {
    type: 'object',
    required: ['content', 'conversation_id'],
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 5000 },
      conversation_id: { type: 'string', format: 'uuid' },
      message_type: { type: 'string', enum: ['text', 'file'] },
      metadata: { type: 'object' }
    }
  }
};

fastify.post('/api/messages', {
  schema: messageSchema,
  preHandler: fastify.authenticate
}, async (request, reply) => {
  // Handler logic
});

// Rate limiting with @fastify/rate-limit
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes'
});

// CORS configuration with @fastify/cors
import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'tauri://localhost',
  credentials: true
});
```

## Backend Service Implementation

### Technology Choice

The Backend Service will be built with TypeScript and:
- **Fastify**: High-performance Node.js web framework with excellent TypeScript support
- **Drizzle ORM**: Lightweight, type-safe ORM for database operations
- **Supabase Auth**: Built-in authentication system for user management
- **TypeScript**: Full type safety across the entire backend codebase

### Project Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── contacts.ts
│   │   ├── messages.ts
│   │   ├── files.ts
│   │   └── ai.ts
│   ├── plugins/
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   └── rateLimit.ts
│   ├── services/
│   │   ├── userService.ts
│   │   ├── messageService.ts
│   │   ├── fileService.ts
│   │   └── aiService.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── migrations/
│   ├── lib/
│   │   └── supabase.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

### Authentication Flow

```typescript
// Supabase Auth-based authentication
// Backend uses Supabase Auth for user management
// Frontend receives Supabase session tokens

// Fastify plugin for protected routes
import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply } from 'fastify';

export default fp(async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    try {
      const { data: { user }, error } = await fastify.supabase.auth.getUser(token);
      
      if (error || !user) {
        return reply.status(403).send({ error: 'Invalid token' });
      }
      
      request.user = user;
    } catch (error) {
      return reply.status(403).send({ error: 'Invalid token' });
    }
  });
});
```

### Database Access

The Backend Service uses Drizzle ORM for type-safe database operations and Supabase client for authentication:

```typescript
// Drizzle client setup
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);

// Supabase client for auth (service role key)
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for backend
);
```

### Drizzle Schema Example

```typescript
import { pgTable, uuid, text, timestamp, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  personalMessage: text('personal_message'),
  displayPictureUrl: text('display_picture_url'),
  presenceStatus: varchar('presence_status', { length: 20 }).default('offline'),
  isAiBot: boolean('is_ai_bot').default(false),
  aiBotPersonality: text('ai_bot_personality'), // e.g., 'friendly_assistant', 'casual_friend'
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull(),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 20 }).default('text'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at')
});
```

### Deployment Options

**Low-Cost Deployment Options:**
1. **Railway.app**: $5/month, easy deployment, automatic scaling
2. **Fly.io**: Free tier available, pay-as-you-go
3. **Render**: Free tier available, automatic deployments
4. **DigitalOcean App Platform**: $5/month, managed service
5. **AWS Lambda + API Gateway**: Pay per request, very cheap for low traffic
6. **Google Cloud Run**: Pay per request, generous free tier

**Recommended: Railway.app or Render**
- Simple deployment from Git repository
- Automatic HTTPS
- Environment variable management
- Reasonable pricing for small-scale applications

### Environment Variables

```env
# Backend Service
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
OPENROUTER_API_KEY=your-openrouter-key
APP_URL=https://your-app-url.com
CORS_ORIGIN=tauri://localhost
```

## Deployment and Distribution

### Build Process

```bash
# Frontend Development
cd msn-messenger
npm run dev

# Backend Development
cd backend
npm run dev

# Production build (Frontend)
cd msn-messenger
npm run tauri build

# Production build (Backend)
cd backend
npm run build
npm start
```

### Platform-Specific Builds

**Windows**
- Output: `.exe` installer and `.msi` package
- Code signing certificate required for production
- Windows Defender SmartScreen consideration

**macOS**
- Output: `.dmg` disk image and `.app` bundle
- Apple Developer ID signing required
- Notarization for Gatekeeper

**Linux**
- Output: `.AppImage`, `.deb`, and `.rpm` packages
- Desktop entry file for application menu integration

### Auto-Update Strategy

- Implement Tauri's built-in updater
- Check for updates on application startup
- Download and install updates in background
- Prompt user to restart after update download

## Performance Optimizations

### Frontend Optimizations
- Virtual scrolling for large contact lists and message history
- Lazy loading of display pictures
- Debounced search input
- Memoized React components
- Code splitting for faster initial load

### Backend Optimizations
- Database indexes on frequently queried columns
- Message pagination (50 messages per page)
- Cached user presence status (5-second TTL)
- Compressed file transfers
- WebSocket connection pooling

### Caching Strategy
- Local cache for user profiles (1 hour TTL)
- Local cache for display pictures (24 hour TTL)
- IndexedDB for offline message queue
- Service worker for asset caching

## AI Bot Implementation

### AI Bot Personalities

AI Bots are implemented as regular user accounts with special flags. Each bot has:

1. **Friendly Assistant**
   - Helpful and supportive
   - Answers questions and provides advice
   - System prompt: "You are a friendly and helpful assistant in a casual messenger chat..."
   - OpenRouter Model: `anthropic/claude-3-haiku` or `openai/gpt-3.5-turbo`

2. **Casual Friend**
   - Conversational and relaxed
   - Discusses hobbies, entertainment, daily life
   - System prompt: "You are a casual friend who enjoys chatting about everyday topics..."
   - OpenRouter Model: `meta-llama/llama-3-8b-instruct`

3. **Creative Companion**
   - Imaginative and artistic
   - Helps with creative projects and brainstorming
   - System prompt: "You are a creative companion who loves art and imagination..."
   - OpenRouter Model: `anthropic/claude-3-haiku`

### AI Integration with OpenRouter

```typescript
// AI service wrapper using OpenRouter
class AIService {
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  
  async generateResponse(
    botUserId: string,
    conversationId: string,
    conversationHistory: Message[]
  ): Promise<string> {
    // Get bot personality from database
    const bot = await this.getBotPersonality(botUserId);
    const messages = this.formatHistory(conversationHistory);
    
    const response = await fetch(this.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL,
        'X-Title': 'MSN Messenger Clone',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: bot.openRouterModel,
        messages: [
          { role: 'system', content: bot.systemPrompt },
          ...messages
        ],
        max_tokens: 200,
        temperature: 0.8
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  // Detect when a message is sent to an AI bot and auto-respond
  async handleMessage(message: Message, conversationId: string): Promise<void> {
    const participants = await this.getConversationParticipants(conversationId);
    const aiBots = participants.filter(p => p.isAiBot);
    
    // Generate responses from all AI bots in the conversation
    for (const bot of aiBots) {
      const history = await this.getConversationHistory(conversationId);
      const response = await this.generateResponse(bot.id, conversationId, history);
      
      // Create message from AI bot
      await this.createMessage({
        conversationId,
        senderId: bot.id,
        content: response,
        messageType: 'text'
      });
    }
  }
}
```

### Message Flow with AI Bots

1. User sends message to conversation containing AI bot(s)
2. Backend Service receives message via POST /api/messages
3. Backend Service persists message to database
4. Backend Service detects AI bot participants in conversation
5. For each AI bot:
   - Fetch conversation history
   - Call OpenRouter API with bot's personality and model
   - Create response message from AI bot user account
   - Persist AI bot's message to database
6. Frontend receives all messages via Supabase Realtime subscriptions

### Rate Limiting
- Limit AI bot responses to 10 per minute per conversation
- Show typing indicator while AI bot generates response
- Implement exponential backoff for OpenRouter API failures
- Cache bot personalities to reduce database queries

## Code Standards and Conventions

### File Naming Conventions

All TypeScript files in both the frontend (MSN Messenger Application) and Backend Service MUST follow Kebab Case naming convention:

**Kebab Case Format:**
- All lowercase letters
- Words separated by hyphens
- File extension included

**Examples:**
- ✅ `user-profile.ts`
- ✅ `chat-window.tsx`
- ✅ `message-service.ts`
- ✅ `auth-plugin.ts`
- ✅ `contact-list.tsx`
- ❌ `UserProfile.ts` (PascalCase - incorrect)
- ❌ `chatWindow.tsx` (camelCase - incorrect)
- ❌ `message_service.ts` (snake_case - incorrect)

**Applies to:**
- React component files (.tsx)
- TypeScript utility files (.ts)
- Service files (.ts)
- Type definition files (.ts)
- Route files (.ts)
- Plugin files (.ts)
- Test files (.test.ts, .spec.ts)

**Note:** This convention applies to file names only. Internal code (classes, functions, variables) should follow standard TypeScript conventions (PascalCase for classes, camelCase for functions/variables).

## Future Enhancements

### Phase 2 Features
- Voice and video calling (WebRTC)
- Custom emoticon creation
- Themes and skins
- Nudge/buzz feature
- Games and activities

### Phase 3 Features
- Mobile companion app
- Browser-based web client
- Plugin/extension system
- Advanced AI features (voice chat, image generation)
