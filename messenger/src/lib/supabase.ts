import { createClient } from '@supabase/supabase-js';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
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
    return profile ? `sb-${profile}-auth` : 'sb-auth';
  } catch {
    return 'sb-auth-token';
  }
}

// Create Tauri Store instance and storage implementation
let store: Store | null = null;
let storageKey = 'sb-auth-token';

const createTauriStorage = async () => {
  storageKey = await getStorageKey();
  store = await Store.load(`${storageKey}.json`);

  return {
    getItem: async (key: string) => {
      try {
        const value = await store!.get<string>(key);
        return value || null;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await store!.set(key, value);
        await store!.save();
      } catch (error) {
        console.error('Failed to save to Tauri store:', error);
      }
    },
    removeItem: async (key: string) => {
      try {
        await store!.delete(key);
        await store!.save();
      } catch (error) {
        console.error('Failed to remove from Tauri store:', error);
      }
    },
  };
};

type TauriStorage = Awaited<ReturnType<typeof createTauriStorage>>;
let customStoragePromise: Promise<TauriStorage> | null = null;

const getCustomStorage = (): Promise<TauriStorage> => {
  if (!customStoragePromise) {
    customStoragePromise = createTauriStorage();
  }
  return customStoragePromise;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      async getItem(key: string) {
        const storage = await getCustomStorage();
        return storage.getItem(key);
      },
      async setItem(key: string, value: string) {
        const storage = await getCustomStorage();
        return storage.setItem(key, value);
      },
      async removeItem(key: string) {
        const storage = await getCustomStorage();
        return storage.removeItem(key);
      },
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
