/**
 * Authentication service for user sign-up, sign-in, and sign-out
 * Handles JWT token storage and persistence
 * Integrates with Zustand auth store for global state management
 */

import { PresenceStatus } from '@/types';
import { apiPost } from '../api-client';
import { useAuthStore } from '../store/auth-store';

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface LoginData {
  email: string;
  password: string;
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
    // Update Zustand store (which also handles Tauri backend storage)
    await useAuthStore.getState().setAuth(response.data.user, response.data.token, response.data.refreshToken);

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
    // Update Zustand store (which also handles Tauri backend storage)
    await useAuthStore.getState().setAuth(response.data.user, response.data.token, response.data.refreshToken);

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
 */
export async function signOut(): Promise<{
  success: boolean;
  error?: string;
}> {
  const token = useAuthStore.getState().token;

  if (token) {
    // Call backend logout endpoint
    const response = await apiPost<{ message: string }>(
      '/api/auth/logout',
      {}
    );

    if (!response.success) {
      console.error('Backend logout failed:', response.error);
    }
  }

  // Clear Zustand store (which also handles Tauri backend storage)
  await useAuthStore.getState().clearAuth();

  return {
    success: true,
  };
}

/**
 * Get the stored authentication token
 * @deprecated Use useAuthStore().token instead
 */
export function getStoredToken(): string | null {
  return useAuthStore.getState().token;
}

/**
 * Get the stored user data
 * @deprecated Use useAuthStore().user instead
 */
export function getStoredUser(): AuthUser | null {
  return useAuthStore.getState().user;
}

/**
 * Check if user is authenticated
 * @deprecated Use useAuthStore().isAuthenticated instead
 */
export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated;
}

/**
 * Clear all authentication data
 * @deprecated Use signOut() instead
 */
export async function clearAuthData(): Promise<void> {
  await useAuthStore.getState().clearAuth();
}

/**
 * Update stored user data
 * @deprecated Use useAuthStore().updateUser() instead
 */
export async function updateStoredUser(user: Partial<AuthUser>): Promise<void> {
  await useAuthStore.getState().updateUser(user);
}
