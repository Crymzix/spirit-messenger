# MSN Messenger Backend Service

Backend service for the MSN Messenger Clone application. Built with Fastify, TypeScript, Drizzle ORM, and Supabase.

## Features

- **Authentication**: Supabase Auth integration with JWT tokens
- **Type-safe Database**: Drizzle ORM with PostgreSQL
- **Real-time Ready**: Designed to work with Supabase Realtime
- **File Uploads**: Support for file transfers up to 100MB
- **Rate Limiting**: Protection against abuse
- **CORS**: Configured for Tauri desktop app

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (via Supabase)
- Supabase account with service role key

## Setup

### Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with Supabase credentials (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions)

4. Run database setup (creates tables, RLS policies, storage buckets, and seeds AI bots):
```bash
npm run db:setup
```

### Detailed Setup

For complete step-by-step instructions on setting up Supabase, creating storage buckets, and configuring the database, see:

📖 **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

This guide covers:
- Creating a Supabase project
- Getting API credentials
- Running migrations
- Setting up storage buckets
- Seeding AI bot users
- Troubleshooting common issues

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check service health

### Authentication (to be implemented)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Users (to be implemented)
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/display-picture` - Upload display picture
- `PUT /api/users/presence` - Update presence status

### Contacts (to be implemented)
- `POST /api/contacts/request` - Send contact request
- `POST /api/contacts/accept` - Accept contact request
- `DELETE /api/contacts/:contactId` - Remove contact

### Messages (to be implemented)
- `POST /api/messages` - Send message
- `POST /api/conversations` - Create conversation
- `POST /api/conversations/:conversationId/leave` - Leave conversation

### Files (to be implemented)
- `POST /api/files/upload` - Upload file
- `GET /api/files/:fileId/download` - Download file

### AI Chatbot (to be implemented)
- `POST /api/ai/message` - Send message to AI chatbot

## Project Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── plugins/         # Fastify plugins
│   ├── services/        # Business logic
│   ├── db/              # Database schema and client
│   ├── lib/             # Utilities (Supabase client)
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Application entry point
├── drizzle.config.ts    # Drizzle ORM configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Database Schema

The database schema is defined using Drizzle ORM in `src/db/schema.ts` and includes:

- **users**: User accounts and profiles (includes AI bot accounts)
- **contacts**: Contact relationships between users
- **conversations**: Chat conversations (one-on-one and group)
- **conversation_participants**: Conversation membership tracking
- **messages**: Chat messages with metadata for emoticons and formatting
- **files**: File transfer metadata and storage paths

### Storage Buckets

- **display-pictures**: User profile pictures (max 5MB)
- **file-transfers**: Files shared in conversations (max 100MB)

### Row Level Security (RLS)

All tables have RLS enabled with read-only policies for the frontend. All write operations must go through the Backend Service using the service role key.

## Technologies

- **Fastify**: High-performance web framework
- **TypeScript**: Type-safe development
- **Drizzle ORM**: Type-safe database operations
- **Supabase**: Authentication and database
- **PostgreSQL**: Database
