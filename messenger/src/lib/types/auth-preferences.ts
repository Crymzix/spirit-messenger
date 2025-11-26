/**
 * Authentication preferences and remembered credentials types
 * Used for Remember Me, Remember Password, and Sign In Automatically features
 */

export interface AuthPreferences {
  rememberMe: boolean;
  rememberPassword: boolean;
  signInAutomatically: boolean;
  rememberedEmail: string | null;
}

export interface RememberedCredentials {
  email: string | null;
  password: string | null;
}
