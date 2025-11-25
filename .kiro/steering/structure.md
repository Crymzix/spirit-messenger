## Project Structure

### Root Layout
```
/
├── messenger/          # Tauri desktop app (main application)
├── backend/            # Fastify API server + BullMQ workers
├── landing/            # Next.js marketing/landing page
└── supabase/           # Supabase local config
```

### Messenger App (`/messenger`)

```
messenger/
├── src/
│   ├── components/           # React components
│   │   ├── screens/          # Full-screen views (sign-in, registration, contacts)
│   │   └── windows/          # Window components (chat, dialogs, modals)
│   ├── lib/
│   │   ├── hooks/            # React Query hooks (auth, contacts, messages, etc.)
│   │   ├── services/         # API service layers (auth, contact, message, etc.)
│   │   ├── store/            # Zustand stores (auth, settings, file-upload, ai-chat)
│   │   ├── utils/            # Utility functions
│   │   ├── api-client.ts     # HTTP client for backend API
│   │   ├── supabase.ts       # Supabase client config
│   │   └── emoticons.ts      # Emoticon mappings
│   ├── types/                # TypeScript type definitions
│   ├── styles/               # Global styles
│   └── *-entry.tsx           # Entry points for different windows
├── src-tauri/                # Rust backend for Tauri
│   ├── src/
│   │   ├── lib.rs            # Tauri commands and state
│   │   └── main.rs           # App entry point
│   └── capabilities/         # Tauri permission configs
├── public/                   # Static assets (images, sounds, emoticons)
└── *.html                    # HTML entry points for each window
```

**Key Patterns:**
- Multiple HTML entry points for different windows (main, chat, dialogs)
- Path aliases: `@/` maps to `src/`, `@/components`, `@/lib`, `@/types`
- Services handle API calls, hooks manage React Query state
- Zustand stores for global state (auth, settings)
- Supabase client for real-time subscriptions and direct reads
- Backend API client for all write operations

### Backend Service (`/backend`)

```
backend/
├── src/
│   ├── routes/               # Fastify route handlers
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── users.ts          # User profile endpoints
│   │   ├── contacts.ts       # Contact management
│   │   ├── contact-groups.ts # Contact group management
│   │   ├── messages.ts       # Messaging endpoints
│   │   ├── files.ts          # File upload/download
│   │   ├── ai.ts             # AI chat endpoints
│   │   └── bot.ts            # Bot management endpoints
│   ├── services/             # Business logic layer
│   │   ├── user-service.ts
│   │   ├── contact-service.ts
│   │   ├── message-service.ts
│   │   ├── bot-service.ts
│   │   ├── llm-service.ts    # LLM integration
│   │   └── presence-listener.ts  # Supabase presence monitoring
│   ├── workers/              # BullMQ background workers
│   │   ├── bot-response-worker.ts      # Process bot replies
│   │   ├── autonomous-message-worker.ts # Bot autonomous messaging
│   │   └── index.ts          # Worker initialization
│   ├── plugins/              # Fastify plugins
│   │   ├── auth.ts           # JWT authentication
│   │   ├── cors.ts           # CORS configuration
│   │   ├── rate-limit.ts     # Rate limiting
│   │   └── multipart.ts      # File upload handling
│   ├── db/
│   │   ├── schema.ts         # Drizzle ORM schema
│   │   ├── client.ts         # Database client
│   │   ├── migrations/       # SQL migrations
│   │   └── setup-database.ts # Database initialization script
│   ├── lib/
│   │   └── supabase.ts       # Supabase admin client
│   ├── config/
│   │   └── queue.ts          # BullMQ configuration
│   ├── types/
│   │   └── index.ts          # Shared types
│   └── scripts/
│       └── seed-bots.ts      # Seed AI bot users
└── drizzle.config.ts         # Drizzle ORM config
```

**Key Patterns:**
- Routes → Services → Database (layered architecture)
- All write operations go through backend (RLS enforces read-only frontend)
- Workers handle async tasks (bot responses, autonomous messaging)
- Plugins for cross-cutting concerns (auth, CORS, rate limiting)
- Service role key for privileged database operations

### Landing Page (`/landing`)

```
landing/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Home page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/               # React components
│   ├── ui/                   # Reusable UI components (shadcn/ui)
│   ├── hero.tsx
│   ├── features.tsx
│   ├── chat.tsx
│   └── downloads.tsx
└── lib/
    └── utils.ts              # Utility functions
```

## Code Organization Conventions

### Import Order
1. External dependencies (react, zustand, etc.)
2. Internal absolute imports (@/components, @/lib)
3. Relative imports (./local-file)
4. Type imports (import type)

### File Naming
- Components: PascalCase (`ContactItem.tsx`)
- Utilities/Services: kebab-case (`api-client.ts`)
- Hooks: kebab-case with `use-` prefix (`use-contacts.ts`)
- Types: kebab-case (`database.ts`)

### Component Structure
- Window components in `components/windows/` (full window UIs)
- Screen components in `components/screens/` (main app screens)
- Reusable components in `components/` root
- Each component exports as default

### State Management
- **Zustand**: Global app state (auth, settings, UI state)
- **React Query**: Server state (contacts, messages, cached data) - ALWAYS use for API calls
- **Supabase Realtime**: Real-time subscriptions (presence, typing, new messages)
- **Tauri State**: Persistent storage across windows (auth tokens, user data)
  - CRITICAL: Multiple Tauri windows do NOT share localStorage
  - Use Tauri commands (`invoke`) for cross-window state persistence
  - Example: `invoke('set_auth')`, `invoke('get_user')`, `invoke('get_token')`

### Data Flow
- **Reads**: Frontend → Supabase client (direct, RLS-protected)
- **Writes**: Frontend → Backend API → Database (service role)
- **Real-time**: Supabase Realtime → Frontend subscriptions
- **Background**: BullMQ workers → Database

### Spec Files
- All new spec/design documents go in `.kiro/specs/msn-messenger-clone/`
- Use markdown format with clear sections for requirements, design, and tasks
