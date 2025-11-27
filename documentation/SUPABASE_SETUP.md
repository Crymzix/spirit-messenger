# Supabase Database Setup Guide

This guide walks you through setting up the complete Supabase database infrastructure for the MSN Messenger Clone application.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Node.js**: Version 18 or higher
3. **Environment Variables**: Supabase credentials

## Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: msn-messenger-clone (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for project to be provisioned (2-3 minutes)

## Step 2: Get Supabase Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (for frontend read operations)
   - **service_role** key (for backend write operations - keep secret!)

3. Go to **Settings** → **Database**
4. Copy the **Connection string** → **URI** format
   - It looks like: `postgresql://postgres:[password]@[host]:[port]/postgres`

## Step 3: Configure Environment Variables

Create or update `backend/.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Backend Service
PORT=3000
NODE_ENV=development

# OpenRouter (for AI bots - optional for now)
OPENROUTER_API_KEY=your-openrouter-key-here
APP_URL=http://localhost:3000

# CORS
CORS_ORIGIN=tauri://localhost
```

**Important**: 
- Replace `[YOUR-PASSWORD]` with your database password
- Replace `[YOUR-PROJECT-REF]` with your project reference
- Replace the keys with actual values from Step 2
- Never commit `.env` file to version control!

## Step 4: Run Database Setup

### Option A: Automated Setup (Recommended)

Run the automated setup script:

```bash
cd backend
npm install
npm run db:setup
```

This script will:
- ✅ Create storage buckets (display-pictures, file-transfers)
- ✅ Run all SQL migrations
- ✅ Create tables with indexes
- ✅ Set up Row Level Security policies
- ✅ Seed AI bot user accounts
- ✅ Verify the setup

### Option B: Manual Setup via Supabase Dashboard

If the automated script fails, you can set up manually:

#### 4.1 Create Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Click "Create a new bucket"
3. Create **display-pictures** bucket:
   - Name: `display-pictures`
   - Public: **No** (unchecked)
   - File size limit: `5242880` (5MB)
   - Allowed MIME types: `image/jpeg,image/png,image/gif`
4. Create **file-transfers** bucket:
   - Name: `file-transfers`
   - Public: **No** (unchecked)
   - File size limit: `104857600` (100MB)
   - Allowed MIME types: (leave empty for all)

#### 4.2 Run SQL Migrations

1. Go to **SQL Editor** in Supabase Dashboard
2. Click "New query"
3. Copy and paste contents of `backend/src/db/migrations/001_initial_schema.sql`
4. Click "Run" (bottom right)
5. Repeat for:
   - `002_storage_policies.sql`
   - `003_seed_ai_bots.sql`

## Step 5: Verify Setup

### Check Tables

1. Go to **Table Editor** in Supabase Dashboard
2. You should see these tables:
   - ✅ users
   - ✅ contacts
   - ✅ conversations
   - ✅ conversation_participants
   - ✅ messages
   - ✅ files

### Check AI Bot Users

1. Go to **Table Editor** → **users** table
2. You should see 3 AI bot users:
   - ✅ Friendly Assistant (friendly_assistant)
   - ✅ Casual Friend (casual_friend)
   - ✅ Creative Companion (creative_companion)
3. All should have `is_ai_bot = true` and `presence_status = online`

### Check RLS Policies

1. Go to **Authentication** → **Policies**
2. Each table should have RLS enabled with SELECT policies
3. No INSERT/UPDATE/DELETE policies (backend handles writes)

### Check Storage Buckets

1. Go to **Storage**
2. You should see:
   - ✅ display-pictures (5MB limit)
   - ✅ file-transfers (100MB limit)

## Step 6: Test Database Connection

Test the connection from your backend:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Supabase client initialized
🚀 Backend Service running on http://localhost:3000
```

## Database Schema Overview

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **users** | User accounts (including AI bots) | email, username, is_ai_bot, presence_status |
| **contacts** | Contact relationships | user_id, contact_user_id, status |
| **conversations** | Chat conversations | type (one_on_one/group), name |
| **conversation_participants** | Conversation membership | conversation_id, user_id, left_at |
| **messages** | All messages | conversation_id, sender_id, content, metadata |
| **files** | File transfer metadata | message_id, filename, storage_path |

### Storage Buckets

| Bucket | Purpose | Size Limit | MIME Types |
|--------|---------|------------|------------|
| **display-pictures** | User profile pictures | 5MB | image/jpeg, image/png, image/gif |
| **file-transfers** | Shared files | 100MB | All types |

### Row Level Security (RLS)

All tables have RLS enabled with **read-only** policies for frontend:

- ✅ Frontend can SELECT (read) data
- ❌ Frontend cannot INSERT/UPDATE/DELETE
- ✅ Backend Service uses service role key to bypass RLS for writes

This architecture ensures:
- Data security (frontend can't modify data directly)
- Real-time updates (frontend subscribes to changes)
- Centralized business logic (all writes go through backend)

## AI Bot Personalities

Three AI bots are pre-configured:

### 1. Friendly Assistant
- **Email**: friendly-assistant@aibot.local
- **Personality**: Helpful and supportive
- **Use Case**: Answering questions, providing advice
- **Model**: Claude 3 Haiku or GPT-3.5 Turbo

### 2. Casual Friend
- **Email**: casual-friend@aibot.local
- **Personality**: Conversational and relaxed
- **Use Case**: Casual chat, discussing hobbies
- **Model**: Llama 3 8B Instruct

### 3. Creative Companion
- **Email**: creative-companion@aibot.local
- **Personality**: Imaginative and artistic
- **Use Case**: Creative projects, brainstorming
- **Model**: Claude 3 Haiku

## Troubleshooting

### Error: "relation does not exist"

**Solution**: Tables weren't created. Run migrations again:
```bash
npm run db:setup
```

### Error: "permission denied for table"

**Solution**: RLS policies blocking access. Check:
1. User is authenticated (has valid JWT token)
2. RLS policies are created correctly
3. Backend uses service role key, not anon key

### Error: "bucket not found"

**Solution**: Storage buckets not created. Create manually via Dashboard:
1. Go to Storage
2. Create `display-pictures` and `file-transfers` buckets

### AI Bots Not Appearing

**Solution**: Check AI bots were seeded:
```sql
SELECT * FROM users WHERE is_ai_bot = TRUE;
```

If empty, run `003_seed_ai_bots.sql` again.

### Connection Timeout

**Solution**: Check DATABASE_URL is correct:
1. Verify password is correct
2. Check project reference matches
3. Ensure IP is not blocked (Supabase allows all by default)

## Security Best Practices

1. ✅ **Never expose service role key** - Only use in backend
2. ✅ **Use anon key in frontend** - Limited to read operations
3. ✅ **Keep .env file secret** - Add to .gitignore
4. ✅ **Enable RLS on all tables** - Already configured
5. ✅ **Validate all inputs** - Backend validates before writes
6. ✅ **Use HTTPS in production** - Supabase provides this

## Next Steps

After successful setup:

1. ✅ Start Backend Service: `npm run dev`
2. ✅ Test authentication endpoints
3. ✅ Verify real-time subscriptions work
4. ✅ Test file uploads to storage
5. ✅ Configure OpenRouter for AI bots (optional)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [Realtime Documentation](https://supabase.com/docs/guides/realtime)

## Support

If you encounter issues:

1. Check Supabase Dashboard logs
2. Review migration files for errors
3. Verify environment variables are correct
4. Check Supabase status page for outages
5. Consult Supabase Discord community

---

**Setup Complete!** 🎉

Your Supabase database is now ready for the MSN Messenger Clone application.
