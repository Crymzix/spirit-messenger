## Development Conventions

### Critical Rules

#### 1. Always Use React Query for API Calls
- ALL API calls MUST use TanStack Query (React Query)
- Never use raw `fetch` or `axios` directly in components
- Create custom hooks in `messenger/src/lib/hooks/` for each API resource
- Example pattern:
  ```typescript
  export function useContacts() {
    return useQuery({
      queryKey: ['contacts'],
      queryFn: () => contactService.getContacts(),
    });
  }
  ```

#### 2. Tauri State Persistence (NOT localStorage)
- NEVER use `localStorage` or `sessionStorage` in Tauri apps
- Multiple Tauri windows do NOT share localStorage state
- Use Tauri backend commands for persistent storage:
  - `invoke('set_auth', { user, token, refreshToken })`
  - `invoke('get_user')`
  - `invoke('get_token')`
  - `invoke('clear_auth')`
- Implement Tauri commands in `messenger/src-tauri/src/lib.rs`
- Use Zustand for in-memory state, Tauri for persistence

#### 3. Spec Files Location
- All new specification and design documents go in `.kiro/specs/msn-messenger-clone/`
- Use markdown format with clear sections
- Include requirements, design decisions, and implementation tasks
- Reference files using `#[[file:relative/path]]` syntax

### Data Access Patterns

#### Reading Data
```typescript
// ✅ CORRECT: Use React Query hook
const { data: contacts } = useContacts();

// ❌ WRONG: Direct fetch in component
const contacts = await fetch('/api/contacts');
```

#### Writing Data
```typescript
// ✅ CORRECT: Use React Query mutation
const mutation = useMutation({
  mutationFn: (data) => contactService.addContact(data),
  onSuccess: () => queryClient.invalidateQueries(['contacts']),
});

// ❌ WRONG: Direct API call without cache invalidation
await apiPost('/api/contacts', data);
```

#### Persistent State
```typescript
// ✅ CORRECT: Use Tauri commands
await invoke('set_auth', { user, token, refreshToken });
const token = await invoke<string>('get_token');

// ❌ WRONG: Use localStorage (windows don't share state)
localStorage.setItem('token', token);
const token = localStorage.getItem('token');
```

### Window Communication

Since Tauri windows are isolated:
- Use Tauri events for cross-window communication: `emit()`, `listen()`
- Store shared state in Tauri backend (Rust state)
- Example: Auth state changes emit `auth-changed` event to other windows

### File Organization

- **Hooks**: `messenger/src/lib/hooks/use-*.ts` - React Query hooks
- **Services**: `messenger/src/lib/services/*-service.ts` - API client wrappers
- **Stores**: `messenger/src/lib/store/*-store.ts` - Zustand stores
- **Specs**: `.kiro/specs/msn-messenger-clone/*.md` - Design documents
- **Tauri Commands**: `messenger/src-tauri/src/lib.rs` - Rust commands

### TypeScript Patterns

- Use strict mode (already configured)
- Prefer `interface` for object shapes, `type` for unions/intersections
- Export types alongside implementation
- Use Drizzle's `InferSelectModel` and `InferInsertModel` for database types
