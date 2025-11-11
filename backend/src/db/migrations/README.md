# Database Migrations

This directory contains SQL migration files for setting up the Supabase database infrastructure for the MSN Messenger Clone application.

## Migration Files

1. **001_initial_schema.sql** - Creates all database tables, indexes, RLS policies, and triggers
2. **002_storage_policies.sql** - Creates RLS policies for Supabase Storage buckets
3. **003_seed_ai_bots.sql** - Seeds the database with AI bot user accounts

## Prerequisites

Before running migrations, ensure you have:

1. A Supabase project created
2. Supabase CLI installed (`npm install -g supabase`)
3. Database connection string from your Supabase project
4. Service role key from your Supabase project settings

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended for Initial Setup)

1. **Create Storage Buckets** (must be done before running migrations):
   - Go to Storage in your Supabase Dashboard
   - Create bucket: `display-pictures`
     - Public: No
     - File size limit: 5MB
     - Allowed MIME types: image/jpeg, image/png, image/gif
   - Create bucket: `file-transfers`
     - Public: No
     - File size limit: 100MB
     - Allowed MIME types: (leave empty for all types)

2. **Run Migrations**:
   - Go to SQL Editor in your Supabase Dashboard
   - Copy and paste the contents of each migration file in order:
     1. `001_initial_schema.sql`
     2. `002_storage_policies.sql`
     3. `003_seed_ai_bots.sql`
   - Execute each migration

3. **Verify Setup**:
   - Check that all tables are created in the Table Editor
   - Verify RLS policies are enabled on all tables
   - Confirm AI bot users exist in the users table
   - Verify storage buckets are created with correct policies

### Option 2: Using Supabase CLI

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run individual migration files
psql $DATABASE_URL -f backend/src/db/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/src/db/migrations/002_storage_policies.sql
psql $DATABASE_URL -f backend/src/db/migrations/003_seed_ai_bots.sql
```

### Option 3: Using Node.js Script

```bash
# Run the setup script
npm run db:setup
```

## Database Schema Overview

### Tables

- **users** - User accounts (including AI bots)
- **contacts** - Contact relationships between users
- **conversations** - Chat conversations (one-on-one and group)
- **conversation_participants** - Tracks participants in conversations
- **messages** - All messages sent in conversations
- **files** - File transfer metadata

### Storage Buckets

- **display-pictures** - User profile pictures (max 5MB)
- **file-transfers** - Files shared in conversations (max 100MB)

### Row Level Security (RLS)

All tables have RLS enabled with read-only policies for the frontend:
- Frontend can only SELECT data
- All INSERT, UPDATE, DELETE operations must go through Backend Service
- Backend Service uses service role key to bypass RLS

### AI Bot Users

Three AI bot accounts are seeded:
1. **Friendly Assistant** - Helpful and supportive
2. **Casual Friend** - Conversational and relaxed
3. **Creative Companion** - Imaginative and artistic

## Environment Variables

Add these to your `.env` file:

```env
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

### Storage Bucket Policies Not Working

If storage policies fail, ensure:
1. Buckets are created before running `002_storage_policies.sql`
2. RLS is enabled on storage.objects table
3. You're using the correct bucket names

### AI Bots Not Appearing

If AI bots don't appear:
1. Check that `003_seed_ai_bots.sql` ran successfully
2. Query: `SELECT * FROM users WHERE is_ai_bot = TRUE;`
3. Verify the email addresses don't conflict with existing users

### RLS Policies Blocking Reads

If frontend can't read data:
1. Ensure user is authenticated (auth.uid() returns valid UUID)
2. Check that RLS policies match the query patterns
3. Verify user has proper relationships (contacts, conversation participants)

## Rollback

To rollback migrations:

```sql
-- Drop all tables (in reverse order of dependencies)
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop storage buckets via Dashboard or API
```

## Next Steps

After running migrations:

1. Update Backend Service environment variables
2. Test authentication flow
3. Verify RLS policies work correctly
4. Test AI bot visibility in frontend
5. Test file upload to storage buckets
