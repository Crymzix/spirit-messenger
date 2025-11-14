/**
 * Database Setup Script
 * 
 * This script automates the setup of the Supabase database infrastructure:
 * - Creates storage buckets
 * - Runs SQL migrations
 * - Verifies setup
 */

import { createClient } from '@supabase/supabase-js';
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres"
import * as dotenv from "dotenv"
import { sql } from 'drizzle-orm';

dotenv.config()

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('   - DATABASE_URL');
    process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: false
    }
});

// Initialize PostgreSQL client
const db = drizzle(process.env.DATABASE_URL);

/**
 * Create storage buckets
 */
async function createStorageBuckets() {
    console.log('\n📦 Creating storage buckets...');

    try {
        // Create display-pictures bucket
        const { error: dpError } = await supabase
            .storage
            .createBucket('display-pictures', {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024, // 5MB
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
            });

        if (dpError && !dpError.message.includes('already exists')) {
            console.error('   ❌ Failed to create display-pictures bucket:', dpError.message);
        } else {
            console.log('   ✅ display-pictures bucket created');
        }

        // Create file-transfers bucket
        const { error: ftError } = await supabase
            .storage
            .createBucket('file-transfers', {
                public: false,
                fileSizeLimit: 10 * 1024 * 1024, // 10MB
            });

        if (ftError && !ftError.message.includes('already exists')) {
            console.error('   ❌ Failed to create file-transfers bucket:', ftError.message);
        } else {
            console.log('   ✅ file-transfers bucket created');
        }
    } catch (error) {
        console.error('   ❌ Error creating storage buckets:', error);
        throw error;
    }
}

/**
 * Run SQL migrations
 */
async function runMigrations() {
    console.log(`\n📄 Running migrations`);

    try {
        await migrate(db, {
            migrationsFolder: './src/db/migrations',
            migrationsSchema: "public",
        });

        console.log(`   ✅ Migrations completed`);
    } catch (error: any) {
        console.error(`   ❌ Migrations failed:`, error);
        throw error;
    }
}

/**
 * Verify database setup
 */
async function verifySetup() {
    console.log('\n🔍 Verifying database setup...');

    try {
        // Check tables exist
        const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

        console.log(`   ✅ Found ${tables.rows?.length || 0} tables:`);
        tables.rows?.forEach((table: any) => {
            console.log(`      - ${table.table_name}`);
        });

        // Check RLS is enabled
        const rlsTables = await db.execute(sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
    `);

        console.log(`\n   ✅ RLS enabled on ${rlsTables.rows?.length || 0} tables`);

        // Check storage buckets
        const { data: buckets, error: bucketsError } = await supabase
            .storage
            .listBuckets();

        if (bucketsError) {
            console.error('   ❌ Failed to list storage buckets:', bucketsError.message);
        } else {
            const ourBuckets = buckets.filter(b =>
                b.name === 'display-pictures' || b.name === 'file-transfers'
            );
            console.log(`\n   ✅ Found ${ourBuckets.length} storage buckets:`);
            ourBuckets.forEach(bucket => {
                console.log(`      - ${bucket.name}`);
            });
        }

    } catch (error: any) {
        console.error('   ❌ Verification failed:', error.message);
        throw error;
    }
}

/**
 * Main setup function
 */
async function setupDatabase() {
    console.log('🚀 Starting database setup...');
    console.log(`   Supabase URL: ${SUPABASE_URL}`);

    try {
        // Step 1: Create storage buckets
        await createStorageBuckets();

        // Step 2: Run migrations
        await runMigrations()

        // Step 3: Verify setup
        await verifySetup();

        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Update your .env file with Supabase credentials');
        console.log('   2. Test authentication flow');
        console.log('   3. Verify RLS policies work correctly');
        console.log('   4. Start the Backend Service');

    } catch (error) {
        console.error('\n❌ Database setup failed!');
        console.error('   Please check the error messages above and try again.');
        process.exit(1);
    }
}

// Run setup
setupDatabase();
