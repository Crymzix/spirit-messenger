## Product Overview

Spirit Messenger is a nostalgic MSN Messenger clone built as a modern desktop application. It recreates the classic Windows Live Messenger experience with contemporary technology while adding AI-powered bot companions.

### Key Features

- Classic MSN Messenger UI with Windows XP styling (xp.css)
- Real-time messaging with contacts and group conversations
- AI chatbot companions with customizable personalities
- File transfers and voice clips
- Presence status and typing indicators
- Contact management with custom groups
- Profile pictures and personal messages
- Emoticons and text formatting
- Desktop notifications

### Architecture

Three-tier application:
- **Frontend**: Tauri desktop app (React + TypeScript)
- **Backend**: Fastify REST API with BullMQ workers
- **Database**: Supabase (PostgreSQL + Realtime + Auth + Storage)

### Target Experience

Recreate the nostalgic feel of MSN Messenger while leveraging modern real-time capabilities and AI to make conversations feel alive with bot personalities that behave like real contacts.
