# ICE Servers Implementation

## Overview
Dynamic ICE (Interactive Connectivity Establishment) server configuration for WebRTC calls using Twilio's TURN/STUN servers. This ensures reliable peer-to-peer connections even behind NATs and firewalls.

## Architecture

### Backend Endpoint
**Route**: `GET /api/calls/ice-servers`
**Authentication**: Required (JWT)

The endpoint fetches fresh ICE servers from Twilio's API and returns them to the client.

#### Request Flow
1. Client requests ICE servers with auth token
2. Backend makes authenticated request to Twilio API
3. Twilio returns STUN/TURN servers with credentials (24h TTL)
4. Backend returns ice_servers array to client

#### Response Format
```json
{
  "success": true,
  "data": {
    "iceServers": [
      {
        "url": "stun:global.stun.twilio.com:3478",
        "urls": "stun:global.stun.twilio.com:3478"
      },
      {
        "credential": "...",
        "url": "turn:global.turn.twilio.com:3478?transport=udp",
        "urls": "turn:global.turn.twilio.com:3478?transport=udp",
        "username": "..."
      }
    ]
  }
}
```

### Frontend Implementation

#### Service Layer (`call-service.ts`)
- `getIceServers()`: Fetches ICE servers from backend API
- Returns array of `IceServer` objects

#### React Query Hook (`call-hooks.ts`)
- `useIceServers()`: React Query hook for fetching ICE servers
- Caches servers for 1 hour (they have 24h TTL from Twilio)
- Automatically retries on failure

#### WebRTC Service (`simple-peer-service.ts`)
- Updated `createPeer()` to accept optional `iceServers` parameter
- Falls back to Google's public STUN server if no servers provided
- Logs ICE servers being used for debugging

## Usage

### Initiating a Call (Caller)
```typescript
// In chat-window.tsx
const { data: iceServers } = useIceServers();

// When creating peer connection
simplePeerService.createPeer({
  initiator: true,
  stream: localStream,
  iceServers: iceServers || [],
});
```

### Answering a Call (Receiver)
```typescript
// In use-incoming-call-handler.ts
const { data: iceServers } = useIceServers();

// When creating peer connection
simplePeerService.createPeer({
  initiator: false,
  stream: localStream,
  iceServers: iceServers || [],
});
```

## Configuration

### Environment Variables
Add to `backend/.env`:
```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
```

Get credentials from: [Twilio Console](https://console.twilio.com/)

## Benefits

1. **Reliable Connections**: TURN servers ensure connectivity even behind restrictive NATs
2. **Dynamic Credentials**: Fresh credentials with 24h TTL for security
3. **Automatic Fallback**: Falls back to public STUN if Twilio unavailable
4. **Efficient Caching**: ICE servers cached for 1 hour to reduce API calls
5. **Global Infrastructure**: Twilio's global TURN server network for low latency

## Testing

### Verify ICE Servers
1. Start a call between two users
2. Check browser console for: `"Creating peer with ICE servers"`
3. Verify ICE servers array contains Twilio TURN servers
4. Monitor WebRTC connection state in call overlays

### Test Behind NAT
1. Test calls between users on different networks
2. Verify connection establishes successfully
3. Check connection quality indicator shows "Good"

## Troubleshooting

### No ICE Servers Returned
- Check Twilio credentials in backend `.env`
- Verify backend logs for Twilio API errors
- Ensure user is authenticated (JWT token valid)

### Connection Fails
- Check browser console for WebRTC errors
- Verify ICE connection state in call store
- Test with public STUN server as fallback
- Check firewall/network restrictions

### Expired Credentials
- ICE servers have 24h TTL from Twilio
- Frontend caches for 1 hour, then refetches
- If issues persist, clear React Query cache

## ICE Connection State Tracking

The implementation also tracks ICE connection state changes for monitoring connection quality:

### SimplePeer Service
- Monitors `RTCPeerConnection.iceConnectionState` changes
- Fires `onIceStateChange` callback with current state
- States: `new`, `checking`, `connected`, `completed`, `failed`, `disconnected`, `closed`

### Call Store
- `setIceConnectionState()`: Updates ICE connection state
- `useIceConnectionState()`: Hook to access current state
- Used by call overlays to display connection quality indicator

### Event Handler Setup
Both incoming and outgoing calls set up the ICE state change handler:
```typescript
simplePeerService.setEventHandlers({
  // ... other handlers
  onIceStateChange: (state) => {
    console.log('ICE connection state:', state);
    callStore.setIceConnectionState(state);
  },
});
```

### Connection Quality Display
- Audio/Video call overlays show connection quality based on ICE state
- `connected`/`completed` → "Good" (green)
- `checking`/`new` → "Connecting..." (orange)
- `disconnected` → "Poor" (orange-red)
- `failed`/`closed` → "Failed" (red)

## Related Files

### Backend
- `backend/src/routes/calls.ts` - ICE servers endpoint
- `backend/.env` - Twilio credentials

### Frontend
- `messenger/src/lib/services/call-service.ts` - API client
- `messenger/src/lib/hooks/call-hooks.ts` - React Query hook
- `messenger/src/lib/services/simple-peer-service.ts` - WebRTC peer management & ICE state tracking
- `messenger/src/lib/store/call-store.ts` - Call state management including ICE state
- `messenger/src/components/windows/chat-window.tsx` - Outgoing calls
- `messenger/src/lib/hooks/use-incoming-call-handler.ts` - Incoming calls
- `messenger/src/components/video-call-overlay.tsx` - Video call UI with connection quality
- `messenger/src/components/audio-call-overlay.tsx` - Audio call UI with connection quality
