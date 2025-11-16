import { createClient } from '@supabase/supabase-js';
import { invoke } from '@tauri-apps/api/core';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Get profile-specific storage key for multi-instance support
async function getStorageKey(): Promise<string> {
  try {
    const profile = await invoke<string | null>('get_profile');
    return profile ? `sb-${profile}-auth-token` : 'sb-auth-token';
  } catch {
    return 'sb-auth-token';
  }
}

// Create a custom storage implementation that uses profile-specific keys
let storageKey = 'sb-auth-token';

// Initialize storage key
getStorageKey().then(key => {
  storageKey = key;
  console.log('Using Supabase storage key:', storageKey);
});

const customStorage = {
  getItem: (_key: string) => {
    return localStorage.getItem(storageKey);
  },
  setItem: (_key: string, value: string) => {
    localStorage.setItem(storageKey, value);
  },
  removeItem: (_key: string) => {
    localStorage.removeItem(storageKey);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: customStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
