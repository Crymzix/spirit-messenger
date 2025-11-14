import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

// Lazy initialization of Supabase client
export const getSupabase = (): SupabaseClient => {
    if (!supabaseInstance) {
        if (!process.env.SUPABASE_URL) {
            throw new Error('SUPABASE_URL environment variable is required');
        }

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
        }

        // Supabase client with service role key for backend operations
        supabaseInstance = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: false,
                },
            }
        );
    }

    return supabaseInstance;
};

// For backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return getSupabase()[prop as keyof SupabaseClient];
    }
});
