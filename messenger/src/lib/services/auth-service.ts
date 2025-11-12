/**
 * Authentication service for user sign-up, sign-in, and sign-out
 * Handles JWT token storage and persistence
 * Integrates with Zustand auth store for global state management
 */

import { apiPost } from '../api-client';
import { useAuthStore } from '../store/auth-store';

const TOKEN_STORAGE_KEY = 'msn_auth_token';
const USER_STORAGE_KEY = 'msn_user_data';

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
}

export interface AuthResponse {
  token: string;
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
    // Update Zustand store (which also handles localStorage)
    useAuthStore.getState().setAuth(response.data.user, response.data.token);

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
    // Update Zustand store (which also handles localStorage)
    useAuthStore.getState().setAuth(response.data.user, response.data.token);

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
  const token = getStoredToken();

  if (token) {
    // Call backend logout endpoint
    const response = await apiPost<{ message: string }>(
      '/api/auth/logout',
      {},
      token
    );

    if (!response.success) {
      console.error('Backend logout failed:', response.error);
    }
  }

  // Clear Zustand store (which also handles localStorage)
  useAuthStore.getState().clearAuth();

  return {
    success: true,
  };
}

/**
 * Get the stored authentication token
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Get the stored user data
 */
export function getStoredUser(): AuthUser | null {
  const userData = localStorage.getItem(USER_STORAGE_KEY);
  if (!userData) {
    return null;
  }

  try {
    return JSON.parse(userData) as AuthUser;
  } catch (error) {
    console.error('Failed to parse stored user data:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getStoredToken() !== null && getStoredUser() !== null;
}

/**
 * Clear all authentication data from localStorage
 */
export function clearAuthData(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Update stored user data
 */
export function updateStoredUser(user: Partial<AuthUser>): void {
  const currentUser = getStoredUser();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...user };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
  }
}
