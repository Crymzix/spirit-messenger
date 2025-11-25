## Tech Stack

### Frontend (Messenger Desktop App)
- **Framework**: Tauri v2 (Rust) + React 19 + TypeScript 5.8
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 + xp.css (Windows XP theme)
- **State Management**: Zustand (in-memory) + Tauri backend (persistent)
- **Data Fetching**: TanStack Query (React Query) - REQUIRED for all API calls
- **Real-time**: Supabase Realtime (WebSocket)
- **Drag & Drop**: @dnd-kit
- **UI Components**: Custom components with xp.css styling
- **Persistence**: Tauri commands (NOT localStorage - windows don't share state)

### Backend Service
- **Framework**: Fastify 4 + TypeScript 5.3
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (via Supabase)
- **Queue System**: BullMQ + Redis (IORedis)
- **AI/LLM**: Vercel AI SDK + OpenAI
- **File Processing**: Sharp (image optimization)
- **TTS**: Google Cloud Text-to-Speech
- **Auth**: Supabase Auth (JWT)

### Landing Page
- **Framework**: Next.js 16 + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui patterns

### Infrastructure
- **Database & Auth**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Storage**: Supabase Storage (display-pictures, file-transfers)
- **Queue/Cache**: Redis (for BullMQ workers)

## Common Commands

### Messenger (Desktop App)
```bash
# Development
npm run dev              # Start Vite dev server
npm run tauri dev        # Start Tauri app in dev mode

# Build
npm run build            # Build frontend (TypeScript + Vite)
npm run tauri build      # Build Tauri desktop app
```

### Backend Service
```bash
# Development
npm run dev              # Start API server with hot reload
npm run workers:dev      # Start BullMQ workers with hot reload
npm run dev:all          # Start both API and workers

# Production
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled API server
npm run workers          # Run compiled workers
npm run start:all        # Run both API and workers

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio
npm run db:setup         # Setup database (tables, RLS, storage, seed bots)
npm run db:seed-bots     # Seed AI bot users
```

### Landing Page
```bash
npm run dev              # Start Next.js dev server (port 1421)
npm run build            # Build for production
npm run start            # Start production server
```

## Environment Variables

### Backend (.env)
- `PORT` - API server port (default: 6666)
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only)
- `SUPABASE_ANON_KEY` - Anonymous key
- `REDIS_URL` - Redis connection for BullMQ
- `OPENAI_API_KEY` - OpenAI API key for AI bots

### Messenger (.env)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_BACKEND_API_URL` - Backend API URL (default: http://localhost:6666)

## Port Assignments
- **1420**: Messenger Vite dev server
- **1421**: Landing Next.js dev server
- **6666**: Backend API server
- **6379**: Redis (default)
