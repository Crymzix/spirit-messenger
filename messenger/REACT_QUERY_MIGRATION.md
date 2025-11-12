# React Query Migration Summary

## Overview

The authentication system has been successfully refactored to use **@tanstack/react-query** for state management, replacing the previous imperative approach with a declarative, hook-based architecture.

## Changes Made

### 1. New Files Created

#### `src/lib/query-client.ts`
- Configured React Query client with sensible defaults
- 5-minute stale time for queries
- Single retry attempt for queries
- No retries for mutations

#### `src/lib/hooks/auth-hooks.ts`
- `useCurrentUser()` - Query hook for current user data
- `useSignUp()` - Mutation hook for user registration
- `useSignIn()` - Mutation hook for user authentication
- `useSignOut()` - Mutation hook for signing out
- Re-exports utility functions from `auth-service.ts`

### 2. Modified Files

#### `src/main.tsx`
- Added `QueryClientProvider` wrapper around the app
- Imported and configured the query client

#### `src/App.tsx`
- Replaced imperative auth calls with React Query hooks
- Removed manual state management for user data
- Added loading states from mutation hooks
- Simplified error handling with built-in mutation states

#### `src/lib/index.ts`
- Added exports for React Query hooks
- Added export for query client

### 3. Preserved Files

#### `src/lib/auth-service.ts`
- Kept all utility functions for token/user management
- Functions are now used internally by React Query hooks
- Still available for direct use when needed

#### `src/lib/api-client.ts`
- No changes - still used by auth hooks for API calls

## Benefits of React Query

### 1. Automatic State Management
- User data is automatically cached and shared across components
- No need for manual state updates or prop drilling

### 2. Built-in Loading States
```typescript
const signInMutation = useSignIn();
// Access loading state directly
if (signInMutation.isPending) {
  return <Spinner />;
}
```

### 3. Built-in Error Handling
```typescript
const signInMutation = useSignIn();
// Access error state directly
if (signInMutation.isError) {
  return <ErrorMessage error={signInMutation.error} />;
}
```

### 4. Optimistic Updates
- User data is immediately updated in cache after successful authentication
- No need to manually update state after API calls

### 5. Automatic Cache Management
- Query cache is automatically cleared on sign out
- Stale data is automatically refetched when needed

### 6. Request Deduplication
- Multiple components can use the same query without duplicate requests
- React Query automatically deduplicates concurrent requests

## Migration Guide

### Before (Imperative)
```typescript
const [user, setUser] = useState<AuthUser | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSignIn = async (email: string, password: string) => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await signIn({ email, password });
    if (result.success && result.user) {
      setUser(result.user);
    } else {
      setError(result.error || 'Sign in failed');
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### After (Declarative with React Query)
```typescript
const { data: user } = useCurrentUser();
const signInMutation = useSignIn();

const handleSignIn = async (email: string, password: string) => {
  try {
    await signInMutation.mutateAsync({ email, password });
    // User is automatically updated in cache
  } catch (error) {
    // Error is automatically captured in mutation state
    throw error;
  }
};

// Access states directly from mutation
const { isPending, isError, error } = signInMutation;
```

## Usage Examples

### Sign In with Loading State
```typescript
function SignInForm() {
  const signInMutation = useSignIn();

  const handleSubmit = async (email: string, password: string) => {
    try {
      await signInMutation.mutateAsync({ email, password });
      // Success - user is now authenticated
    } catch (error) {
      // Error is available in signInMutation.error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" />
      <input type="password" />
      <button disabled={signInMutation.isPending}>
        {signInMutation.isPending ? 'Signing in...' : 'Sign In'}
      </button>
      {signInMutation.isError && (
        <div>Error: {signInMutation.error.message}</div>
      )}
    </form>
  );
}
```

### Display Current User
```typescript
function UserProfile() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.displayName}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Sign Out with Loading State
```typescript
function SignOutButton() {
  const signOutMutation = useSignOut();

  return (
    <button 
      onClick={() => signOutMutation.mutateAsync()}
      disabled={signOutMutation.isPending}
    >
      {signOutMutation.isPending ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
```

## Testing Considerations

### Mocking React Query
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function renderWithQueryClient(component: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  );
}
```

## Performance Improvements

1. **Reduced Re-renders**: React Query optimizes re-renders by only updating components that use the changed data
2. **Automatic Caching**: User data is cached and reused across components
3. **Background Refetching**: Stale data can be refetched in the background without blocking UI
4. **Request Deduplication**: Multiple components requesting the same data result in a single API call

## Future Enhancements

1. **Token Refresh**: Implement automatic token refresh using React Query's `refetchInterval`
2. **Optimistic Updates**: Add optimistic updates for profile changes
3. **Offline Support**: Use React Query's persistence plugins for offline support
4. **DevTools**: Add React Query DevTools for debugging in development

## Dependencies

- `@tanstack/react-query`: ^5.x (already installed)

## Backward Compatibility

All original utility functions from `auth-service.ts` are still available and can be used directly if needed:
- `getStoredToken()`
- `getStoredUser()`
- `isAuthenticated()`
- `clearAuthData()`
- `updateStoredUser()`

These are also re-exported from `auth-hooks.ts` for convenience.

## Conclusion

The migration to React Query provides a more robust, maintainable, and feature-rich authentication system with minimal code changes. The declarative approach reduces boilerplate and makes the code easier to understand and test.
