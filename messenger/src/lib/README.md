# Authentication Service Documentation

## Overview

This directory contains the authentication logic for the MSN Messenger Clone frontend application. The authentication system uses **React Query** (@tanstack/react-query) for state management, providing automatic caching, background refetching, and optimistic updates.

## Architecture Pattern

The codebase follows a layered architecture with clear separation of concerns:

### Layers

1. **Services Layer** (`services/`)
   - Contains pure functions that make API calls
   - Accept tokens and data as parameters
   - Return promises with typed responses
   - Should NOT access global state directly
   - Example: `setUserPresenceStatus(status, token)`

2. **Hooks Layer** (`hooks/`)
   - React Query hooks that wrap service functions
   - Automatically retrieve tokens from `useAuthStore`
   - Handle loading states, errors, and cache updates
   - Update Zustand store when mutations succeed
   - Example: `useSetPresenceStatus()`

3. **Components Layer** (`components/`)
   - UI components that use hooks
   - Should NEVER import from `services/` directly
   - Always use hooks for API operations
   - Example: `const setPresenceStatus = useSetPresenceStatus()`

### Token Management Pattern

**❌ DON'T** call service functions directly from components:
```typescript
// BAD: Passing token manually
const token = useAuthStore(state => state.token);
await setUserPresenceStatus(status, token);
```

**✅ DO** use React Query hooks:
```typescript
// GOOD: Hook handles token internally
const setPresenceStatus = useSetPresenceStatus();
await setPresenceStatus.mutateAsync(status);
```

This pattern ensures:
- Consistent token retrieval across the app
- Automatic cache invalidation and updates
- Built-in loading and error states
- Type safety and reduced boilerplate

## Files

### `api-client.ts`

HTTP client for making requests to the Backend Service API. Provides a clean interface for all API calls with automatic token injection and error handling.

**Key Functions:**
- `apiRequest<T>()` - Generic request handler
- `apiGet<T>()` - GET requests
- `apiPost<T>()` - POST requests
- `apiPut<T>()` - PUT requests
- `apiDelete<T>()` - DELETE requests

**Configuration:**
- Base URL: `VITE_BACKEND_API_URL` environment variable (defaults to `http://localhost:6666`)
- Automatic JSON serialization/deserialization
- Bearer token authentication support

### `auth-service.ts`

Core authentication utilities for token and user data management.

**Key Functions:**
- `getStoredToken()` - Retrieves JWT token from localStorage
- `getStoredUser()` - Retrieves user data from localStorage
- `isAuthenticated()` - Checks if user is authenticated
- `clearAuthData()` - Clears all authentication data
- `updateStoredUser()` - Updates stored user data

### `presence-service.ts`

Presence management service for tracking user availability status and activity.

**Key Functions:**
- `updatePresence()` - Manually update user presence status
- `setUserPresenceStatus()` - Set user presence status with auto-away support
- `startActivityTracking()` - Enable automatic "away" status after 5 minutes of inactivity
- `stopActivityTracking()` - Disable activity tracking
- `getCurrentPresenceStatus()` - Get current presence status
- `getUserSetPresenceStatus()` - Get user-set status (not auto-away)
- `isActivityTrackingEnabled()` - Check if activity tracking is enabled
- `getTimeSinceLastActivity()` - Get time since last user activity

**Activity Tracking:**
The service monitors mouse movement, keyboard input, mouse clicks, scroll events, and touch events to detect user activity. After 5 minutes of inactivity, it automatically sets the status to "away" (unless the user has manually set their status to "away" or "appear_offline").

### `auth-hooks.ts`

React Query hooks for authentication operations. These hooks provide automatic state management, caching, and error handling.

**Key Hooks:**

#### `useCurrentUser()`
Retrieves the current authenticated user from cache/storage.

```typescript
const { data: user, isLoading, error } = useCurrentUser();

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Not authenticated</div>;

return <div>Welcome, {user.displayName}!</div>;
```

#### `useSignUp()`
Mutation hook for user registration.

```typescript
const signUpMutation = useSignUp();

const handleRegister = async () => {
  try {
    await signUpMutation.mutateAsync({
      email: 'user@example.com',
      password: 'password123',
      username: 'username',
      displayName: 'Display Name'
    });
    // User is now authenticated
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// Access mutation state
const { isPending, isError, error } = signUpMutation;
```

#### `useSignIn()`
Mutation hook for user authentication.

```typescript
const signInMutation = useSignIn();

const handleSignIn = async () => {
  try {
    await signInMutation.mutateAsync({
      email: 'user@example.com',
      password: 'password123'
    });
    // User is now authenticated
  } catch (error) {
    console.error('Sign in failed:', error);
  }
};

// Access mutation state
const { isPending, isError, error } = signInMutation;
```

#### `useSignOut()`
Mutation hook for signing out the current user.

```typescript
const signOutMutation = useSignOut();

const handleSignOut = async () => {
  await signOutMutation.mutateAsync();
  // User is now signed out, cache is cleared
};

// Show loading state
<button disabled={signOutMutation.isPending}>
  {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
</button>
```

### `query-client.ts`

React Query client configuration with default options.

**Configuration:**
- Query retry: 1 attempt
- Refetch on window focus: disabled
- Stale time: 5 minutes
- Mutation retry: 0 attempts

## Setup

### 1. Wrap your app with QueryClientProvider

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
```

### 2. Use authentication hooks in components

```typescript
import { useSignIn, useCurrentUser, useSignOut } from './lib/auth-hooks';

function App() {
  const { data: user } = useCurrentUser();
  const signInMutation = useSignIn();
  const signOutMutation = useSignOut();

  if (!user) {
    return <SignInForm onSubmit={signInMutation.mutateAsync} />;
  }

  return (
    <div>
      <h1>Welcome, {user.displayName}!</h1>
      <button onClick={() => signOutMutation.mutateAsync()}>
        Sign Out
      </button>
    </div>
  );
}
```

## Token Storage

Authentication tokens are stored in localStorage with the following keys:
- `msn_auth_token` - JWT authentication token
- `msn_user_data` - Serialized user data (JSON)

## React Query Benefits

### Automatic Caching
User data is cached and shared across components without prop drilling.

### Loading States
Access loading states directly from hooks:
```typescript
const { isPending } = useSignIn();
```

### Error Handling
Errors are automatically captured and accessible:
```typescript
const { isError, error } = useSignIn();
```

### Optimistic Updates
User data is immediately updated in cache after successful authentication.

### Automatic Refetching
Queries can be configured to refetch on various triggers (window focus, network reconnection, etc.).

## Usage Example

```typescript
import { 
  useSignIn, 
  useSignOut, 
  useCurrentUser,
  isAuthenticated 
} from './lib/auth-hooks';

function AuthenticatedApp() {
  const { data: user, isLoading } = useCurrentUser();
  const signInMutation = useSignIn();
  const signOutMutation = useSignOut();

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      console.log('User is authenticated');
    }
  }, []);

  // Handle sign in
  const handleSignIn = async (email: string, password: string) => {
    try {
      await signInMutation.mutateAsync({ email, password });
      // Redirect to main app
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOutMutation.mutateAsync();
    // Redirect to sign in
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <SignInForm 
        onSubmit={handleSignIn}
        isLoading={signInMutation.isPending}
        error={signInMutation.error}
      />
    );
  }

  return (
    <div>
      <h1>Welcome, {user.displayName}!</h1>
      <button 
        onClick={handleSignOut}
        disabled={signOutMutation.isPending}
      >
        {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}
```

## Environment Variables

Required environment variables in `.env`:

```env
VITE_BACKEND_API_URL=http://localhost:6666
```

## Error Handling

React Query mutations provide built-in error handling:

```typescript
const signInMutation = useSignIn();

// Check for errors
if (signInMutation.isError) {
  console.error(signInMutation.error);
}

// Handle errors in async/await
try {
  await signInMutation.mutateAsync(credentials);
} catch (error) {
  // Handle error
  console.error(error);
}
```

## Automatic Token Refresh

The authentication system includes automatic token refresh to prevent sessions from expiring:

### How It Works

1. **Dual Token System**:
   - **Access Token**: Short-lived token used for API requests (expires in 1 hour by default)
   - **Refresh Token**: Long-lived token used to obtain new access tokens (expires in 30 days by default)

2. **Automatic Refresh**:
   - Supabase's `autoRefreshToken` automatically refreshes tokens before they expire
   - Periodic check every 5 minutes to ensure token validity
   - Proactive refresh when token expires in less than 10 minutes
   - Handles `TOKEN_REFRESHED` events from Supabase

3. **Session Persistence**:
   - Both tokens are stored securely in Tauri backend (persists across app restarts)
   - Supabase session is restored on app startup
   - Tokens are synchronized across all windows

### Implementation Details

The token refresh system operates on multiple layers:

```typescript
// 1. Supabase automatic refresh (handled by Supabase client)
// Configuration in supabase.ts:
export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,  // Automatically refresh before expiration
    persistSession: true,
  }
});

// 2. Manual refresh check (every 5 minutes)
startTokenRefreshInterval(); // Called after successful auth

// 3. Event-based refresh (Supabase onAuthStateChange)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session) {
    // Update stored tokens
  }
});
```

### Token Storage

Tokens are stored in multiple locations:
1. **Zustand Store**: In-memory state for immediate access
2. **Tauri Backend**: Persistent storage on disk (survives app restarts)
3. **Supabase Client**: Manages session and automatic refresh

## Security Considerations

1. **Token Storage**: Tokens are stored securely in the Tauri backend with file-system encryption. Access tokens are short-lived (1 hour) and refresh tokens are long-lived (30 days).
2. **HTTPS**: Always use HTTPS in production to protect tokens in transit.
3. **Automatic Token Refresh**: Tokens are automatically refreshed before expiration, preventing session interruptions.
4. **XSS Protection**: Ensure proper input sanitization to prevent XSS attacks.
5. **Query Cache**: Sensitive data is cached in memory. Clear cache on sign out.

## Presence Service Usage

### Basic Presence Updates with Hooks

**Important:** Always use the React Query hooks (`useSetPresenceStatus`) instead of calling service functions directly. The hooks automatically handle token retrieval from the auth store.

```typescript
import { useSetPresenceStatus } from './lib/hooks/presence-hooks';
import type { PresenceStatus } from '@/types';

function PresenceSelector() {
  const setPresenceStatus = useSetPresenceStatus();

  const handleStatusChange = async (status: PresenceStatus) => {
    try {
      await setPresenceStatus.mutateAsync(status);
      console.log('Presence updated to:', status);
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  };

  return (
    <select
      onChange={(e) => handleStatusChange(e.target.value as PresenceStatus)}
      disabled={setPresenceStatus.isPending}
    >
      <option value="online">Online</option>
      <option value="away">Away</option>
      <option value="busy">Busy</option>
      <option value="appear_offline">Appear Offline</option>
    </select>
  );
}
```

### Activity Tracking

```typescript
import { startActivityTracking, stopActivityTracking } from './lib/presence-service';
import { useAuthStore } from './lib/store/auth-store';
import { useEffect } from 'react';

function App() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Start tracking activity when user signs in
      startActivityTracking(token, 'online');

      // Clean up when component unmounts or user signs out
      return () => {
        stopActivityTracking();
      };
    }
  }, [isAuthenticated, token]);

  return <div>Your app content</div>;
}
```

### Monitoring Activity Status

```typescript
import { 
  getCurrentPresenceStatus,
  getUserSetPresenceStatus,
  getTimeSinceLastActivity,
  isActivityTrackingEnabled 
} from './lib/presence-service';

function PresenceDebugPanel() {
  const [info, setInfo] = useState({
    current: getCurrentPresenceStatus(),
    userSet: getUserSetPresenceStatus(),
    timeSinceActivity: getTimeSinceLastActivity(),
    isTracking: isActivityTrackingEnabled()
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setInfo({
        current: getCurrentPresenceStatus(),
        userSet: getUserSetPresenceStatus(),
        timeSinceActivity: getTimeSinceLastActivity(),
        isTracking: isActivityTrackingEnabled()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <p>Current Status: {info.current}</p>
      <p>User Set Status: {info.userSet}</p>
      <p>Time Since Activity: {Math.floor(info.timeSinceActivity / 1000)}s</p>
      <p>Tracking Enabled: {info.isTracking ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

## Requirements Fulfilled

This implementation fulfills the following requirements:
- **1.2**: User authentication through Backend Service
- **1.4**: JWT token management and session handling
- **1.5**: Sign-out functionality
- **3.2**: Presence status updates and automatic "away" after 5 minutes
- **16.1**: Kebab-case file naming convention
- **16.3**: TypeScript implementation with proper types

## React Query Integration

The authentication system uses React Query for:
- ✅ Automatic state management
- ✅ Built-in loading and error states
- ✅ Optimistic updates
- ✅ Cache management
- ✅ Automatic refetching
- ✅ Request deduplication
- ✅ Background updates
