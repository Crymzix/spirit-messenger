# Authentication Service Documentation

## Overview

This directory contains the authentication logic for the MSN Messenger Clone frontend application. The authentication system uses **React Query** (@tanstack/react-query) for state management, providing automatic caching, background refetching, and optimistic updates.

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

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage. For production, consider using more secure storage mechanisms.
2. **HTTPS**: Always use HTTPS in production to protect tokens in transit.
3. **Token Expiration**: Implement token refresh logic when the backend supports it.
4. **XSS Protection**: Ensure proper input sanitization to prevent XSS attacks.
5. **Query Cache**: Sensitive data is cached in memory. Clear cache on sign out.

## Requirements Fulfilled

This implementation fulfills the following requirements:
- **1.2**: User authentication through Backend Service
- **1.4**: JWT token management and session handling
- **1.5**: Sign-out functionality
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
