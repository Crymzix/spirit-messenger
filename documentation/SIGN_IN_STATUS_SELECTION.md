# Sign-In Status Selection

## Overview
Users can now select their presence status before signing in, allowing them to appear with their desired status (Online, Busy, Away, etc.) immediately upon authentication.

## Implementation

### Backend Changes

**File: `backend/src/routes/auth.ts`**
- Updated `/api/auth/login` endpoint to accept optional `presenceStatus` parameter
- When provided, the user's presence status is updated in the database during login
- Supported statuses: `online`, `away`, `busy`, `appear_offline`, `offline`

**File: `backend/src/types/index.ts`**
- Added optional `presenceStatus` field to `LoginRequest` interface

### Frontend Changes

**File: `messenger/src/lib/services/auth-service.ts`**
- Updated `LoginData` interface to include optional `presenceStatus` field
- The status is passed through to the backend API during authentication

**File: `messenger/src/components/screens/sign-in-screen.tsx`**
- Status dropdown already existed in the UI
- Updated `onSignIn` callback to pass the selected status as a third parameter
- Status is sent to the backend during sign-in

**File: `messenger/src/components/windows/main-window.tsx`**
- Updated `handleSignIn` to accept status parameter
- Maps UI-friendly status strings to backend `PresenceStatus` format:
  - "Online" → `online`
  - "Busy" → `busy`
  - "Be Right Back" → `away`
  - "Away" → `away`
  - "On The Phone" → `busy`
  - "Out To Lunch" → `away`
  - "Appear Offline" → `appear_offline`
- Updated presence initialization to use the user's actual status from login instead of hardcoding 'online'

## Status Mapping

The sign-in screen displays user-friendly status labels that are mapped to backend presence statuses:

| UI Label | Backend Status |
|----------|---------------|
| Online | `online` |
| Busy | `busy` |
| Be Right Back | `away` |
| Away | `away` |
| On The Phone | `busy` |
| Out To Lunch | `away` |
| Appear Offline | `appear_offline` |

## User Flow

1. User enters email and password on sign-in screen
2. User selects desired status from dropdown (defaults to "Online")
3. User clicks "Sign In"
4. Backend authenticates user and sets their presence status
5. Frontend receives auth response with the selected status
6. Activity tracking starts with the user's chosen status
7. User appears to contacts with the selected status immediately

## Technical Notes

- The status selection is optional - if not provided, the user's previous status is maintained
- Activity tracking respects the initial status and will auto-set to "away" after 5 minutes of inactivity (unless status is manually set to away/appear offline)
- The presence status is stored in the database and synced via Supabase Realtime to all contacts
