/**
 * Authentication service for user sign-up, sign-in, and sign-out
 * Token and session persistence is handled entirely by Supabase with Tauri Store backend
 * Integrates with Zustand auth store for global state management
 */

import { PresenceStatus } from '@/types';
import { apiPost } from '../api-client';
import { supabase } from '../supabase';

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface LoginData {
  email: string;
  password: string;
  presenceStatus?: PresenceStatus;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  personalMessage?: string;
  displayPictureUrl?: string;
  presenceStatus?: PresenceStatus;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Sign up a new user
 */
export async function signUp(data: RegisterData): Promise<{
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}> {
  const response = await apiPost<AuthResponse>('/api/auth/register', data);

  if (response.success && response.data) {
    // Set Supabase session (auto-persisted via Tauri Store)
    await supabase.auth.setSession({
      access_token: response.data.token,
      refresh_token: response.data.refreshToken,
    });

    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
    };
  }

  return {
    success: false,
    error: response.error || 'Failed to sign up',
  };
}

/**
 * Sign in an existing user
 */
export async function signIn(data: LoginData): Promise<{
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}> {
  const response = await apiPost<AuthResponse>('/api/auth/login', data);

  if (response.success && response.data) {
    // Set Supabase session (auto-persisted via Tauri Store)
    await supabase.auth.setSession({
      access_token: response.data.token,
      refresh_token: response.data.refreshToken,
    });

    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
    };
  }

  return {
    success: false,
    error: response.error || 'Failed to sign in',
  };
}

/**
 * Sign out the current user
 * Preserves authentication preferences (Remember Me, Remember Password, Sign In Automatically)
 * but clears active session tokens
 */
export async function signOut(): Promise<{
  success: boolean;
  error?: string;
}> {
  const response = await apiPost<{ message: string }>(
    '/api/auth/logout',
    {}
  );

  if (!response.success) {
    console.error('Backend logout failed:', response.error);
  }

  // Sign out from Supabase (clears persisted session)
  await supabase.auth.signOut();

  return {
    success: true,
  };
}