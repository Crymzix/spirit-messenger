# Spirit Messenger

A modern desktop application that faithfully recreates the beloved MSN Messenger experience with cross-platform support and contemporary architecture. Built with Tauri for the native desktop app, React for the UI, a Node.js/TypeScript backend, Supabase for data persistence, and AI companions powered by OpenRouter.

## Project Overview

Spirit Messenger is a full-featured instant messaging application that combines nostalgia with modern technology. It supports one-on-one and webcam/voice calls, presence indicators, file transfers, and AI chatbot companions for engaging conversations anytime.

### Key Features

- **User Authentication & Accounts** - Secure registration and sign-in with session management
- **Contact Management** - Add, remove, and organize contacts into custom groups
- **Presence & Status** - Set availability status (Online, Away, Busy, Appear Offline) with custom status messages
- **One-on-One Chat** - Real-time messaging with message history
- **Rich Text & Emoticons** - 20+ classic MSN Messenger emoticons with auto-conversion and text formatting (bold, italic, colors)
- **File Transfer** - Share files up to 100 MB with progress tracking
- **Notifications** - Audio/visual alerts for messages, sign-in/sign-out events
- **User Profiles** - Customizable display pictures (96x96), display names, and personal messages
- **AI Bot Companions** - Chat with AI personalities when your contacts are offline
- **Search & History** - Full-text search across chat history with filtering
- **Classic UI** - Faithful recreation of MSN Messenger 7.5 look and feel
- **Cross-Platform** - Native support for Windows 10+, macOS 11+, and Linux (GTK 3.0+)

## Project Structure

```
msn-messenger/
├── messenger/                  # Tauri desktop application (React + TypeScript)
│   ├── src/                   # React source code
│   ├── src-tauri/             # Rust backend for Tauri
│   ├── package.json           # Frontend dependencies
│   └── tauri.conf.json        # Tauri configuration
├── backend/                    # Node.js/TypeScript backend service
│   ├── src/                   # Backend source code
│   ├── package.json           # Backend dependencies
│   └── .env.example           # Environment variables template
├── landing/                    # Next.js landing page
│   └── package.json           # Landing page dependencies
├── supabase/                   # Supabase configuration
│   └── config.toml            # Supabase local setup
├── documentation/             # Project documentation
└── README.md                   # This file
```

## Architecture

### Frontend (Messenger App)
- **Framework**: Tauri 2 + React 19 + TypeScript
- **Styling**: TailwindCSS 4 + xp.css (Windows XP-inspired styling)
- **State Management**: Zustand for local state
- **API Client**: React Query for server state management
- **UI Component Library**: Custom components + Radix UI patterns
- **File Drag & Drop**: dnd-kit library

### Backend Service
- **Runtime**: Node.js with TypeScript (tsx)
- **Framework**: Fastify 4
- **Database**: PostgreSQL via Drizzle ORM
- **Real-Time**: Supabase real-time subscriptions (WebSocket)
- **AI**: OpenRouter for multi-LLM access
- **Job Queue**: BullMQ with Redis
- **File Storage**: Backend file storage with Supabase integration
- **Authentication**: JWT-based with refresh tokens

### Data Layer
- **Database**: PostgreSQL (Supabase)
- **Real-Time Subscriptions**: Supabase WebSocket protocol
- **Schema Management**: Drizzle ORM with migrations

### Desktop Framework
- **Native Capabilities**: Tauri plugins for notifications, file dialogs, tray, window state
- **Platform Integration**: macOS private API, system tray, auto-start

## Getting Started

### Prerequisites

- **Node.js** 18+ with pnpm package manager
- **Rust** 1.70+ (for Tauri desktop app)
- **PostgreSQL** 14+ or Supabase project
- **Redis** (for job queue in backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd msn-messenger
   ```

2. **Install dependencies for all workspaces**
   ```bash
   pnpm install
   ```

   This installs dependencies for:
   - `/messenger` - Desktop application
   - `/backend` - Backend service
   - `/landing` - Landing page

### Configuration

#### Backend Setup

1. **Create environment file**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure environment variables**

   Essential variables (required):
   - `DATABASE_URL` - PostgreSQL connection string from Supabase
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for backend access)
   - `SUPABASE_ANON_KEY` - Supabase anonymous key (for frontend)
   - `PORT` - Backend server port (default: 3000)
   - `CORS_ORIGIN` - CORS origin (use `tauri://localhost` for Tauri app)

   Optional variables (for advanced features):
   - `OPENROUTER_API_KEY` - OpenRouter API key for AI bots
   - `ENABLE_ORCHESTRATOR` - Enable AI bot orchestrator for autonomous messages
   - `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` - For WebRTC ICE servers
   - `NEWS_API_KEY` - For news banner functionality
   - `KLIPY_API_KEY` - For GIF/sticker/meme support

   See [backend/.env.example](backend/.env.example) for all available options.

3. **Set up database**
   ```bash
   cd backend
   npm run db:setup
   npm run db:seed-bots  # Seeds AI bot profiles
   ```

#### Supabase Setup

1. **Create a Supabase project** at https://supabase.com

2. **Get your credentials**:
   - Dashboard → Settings → API → Project URL and API keys
   - Database → Connection string (for `DATABASE_URL`)

3. **Apply database migrations** (handled by `db:setup` above)

4. **Enable real-time** for required tables in Supabase Dashboard

#### Desktop App Setup

The desktop app configuration is in `messenger/tauri.conf.json`:
- Dev server runs on `http://localhost:1420`
- Tauri dev proxy forwards to the React dev server
- Ensure backend is running before starting the dev app

### Running the Application

#### Option 1: Development Mode (Recommended for development)

**Terminal 1 - Backend**
```bash
cd backend
npm run dev
```
This starts the backend on `http://localhost:3000`

**Terminal 2 - Backend Workers** (optional, for AI orchestrator)
```bash
cd backend
npm run workers:dev
```

**Terminal 3 - Desktop App**
```bash
cd messenger
pnpm tauri dev
```
This launches the Tauri app with hot-reload. The React dev server runs on `http://localhost:1420`.

**Terminal 4 - Landing Page** (optional)
```bash
cd landing
pnpm dev
```
Landing page available at `http://localhost:1421`

#### Option 2: Production Mode

**Build all packages**
```bash
pnpm build
```

**Start backend**
```bash
cd backend
npm start
```

**Start backend workers**
```bash
cd backend
npm run workers
```

**Build and run desktop app**
```bash
cd messenger
pnpm tauri build  # Creates native installer
# Run the built app from dist or open the generated installer
```

#### Option 3: Run Everything Concurrently

**Backend (with workers)**
```bash
cd backend
npm run dev:all
```

**Desktop App** (in separate terminal)
```bash
cd messenger
pnpm tauri dev
```

### Development Workflow

1. **Code Standards**: All TypeScript files use kebab-case naming (e.g., `user-profile.ts`, `chat-message.tsx`)

2. **API Integration**: Backend API calls use React Query hooks in `/messenger/src/hooks/`:
   - Authentication hooks: `auth-hooks.ts`
   - Contact hooks: `contact-hooks.ts`
   - Message hooks: `message-hooks.ts`
   - Presence hooks: `presence-hooks.ts`
   - Profile hooks: `profile-hooks.ts`

3. **State Management**:
   - Local UI state: Zustand stores
   - Server state: React Query
   - Real-time data: Supabase subscriptions

4. **Making API Changes**:
   - Update backend routes in `/backend/src/routes/`
   - Create/update React Query hooks
   - Component usage remains clean and simple

## API Documentation

### Backend Endpoints

The backend provides RESTful API endpoints for all operations. Key routes:

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- **Contacts**: `GET /contacts`, `POST /contacts/add`, `DELETE /contacts/:id`
- **Messages**: `GET /conversations/:id/messages`, `POST /conversations/:id/messages`
- **Groups**: `POST /conversations/group`, `GET /conversations/:id/participants`
- **Presence**: `PUT /presence`, `GET /presence/:userId`
- **Profile**: `GET /profile`, `PUT /profile`, `POST /profile/picture`
- **Search**: `GET /search/messages`

See [backend documentation](documentation/) for detailed API specs.

### Real-Time Subscriptions

Supabase real-time subscriptions are used for:
- Incoming messages (immediate delivery)
- Presence status changes
- Typing indicators
- File transfer notifications
- Contact request updates

## Deployment

### Backend Deployment

The backend can be deployed to:
- **Fly.io** (configured with `fly.toml`)
- **Docker** (included `Dockerfile`)
- **Traditional VPS/Cloud hosting**

Environment variables must be set in your hosting provider.

### Desktop App Distribution

The desktop app can be distributed as:
- Native installers for Windows (.msi)
- macOS app (.dmg or .app)
- AppImage for Linux
- Updater integration via `tauri-plugin-updater`

## Troubleshooting

### Backend fails to start
- Check `DATABASE_URL` is correct and database is accessible
- Ensure Redis is running (if using job queue)
- Check port 3000 is not in use

### Desktop app can't connect to backend
- Verify backend is running on the configured port
- Check `CORS_ORIGIN` in backend `.env` matches app origin
- Check firewall isn't blocking localhost connections

### Messages not syncing
- Verify Supabase real-time is enabled on the messages table
- Check WebSocket connection in browser DevTools
- Ensure authentication token is valid

### Database migration errors
- Run `npm run db:setup` in backend directory
- Check Supabase dashboard for schema issues
- Verify database user has appropriate permissions

## Performance Considerations

- Messages are cached locally in React Query with 5-minute stale time
- Real-time subscriptions update immediately for critical data
- Optimistic updates for messages and presence changes
- File transfers show progress with cancellation support
- Image resize (96x96) happens server-side for profile pictures

## Security

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- CORS restricted to Tauri app origin
- File upload size limits (100 MB for transfers, 5 MB for profile pictures)
- Database access via Supabase with row-level security policies
- Sensitive environment variables must be configured per deployment

## Contributing

Code standards:
- TypeScript strict mode
- ESLint for code quality
- Kebab-case file naming
- React Query for server state
- Zustand for local state
- TailwindCSS for styling

## License

MIT

## Support & Documentation

- Architecture details: [documentation/](documentation/)
- Backend README: [backend/README.md](backend/README.md)
- Requirements & specs: [.kiro/specs/](./kiro/specs/)
- Issues & bug reports: GitHub Issues
