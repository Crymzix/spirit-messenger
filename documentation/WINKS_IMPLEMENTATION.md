# Winks Implementation (GIFs, Stickers, and Memes)

## Overview

The Winks feature allows users to send GIFs, stickers, and memes in conversations using the Klipy API. Users can browse trending media or search for specific content directly from the chat window.

## Architecture

### Backend Service

**Route**: `backend/src/routes/media.ts`

Provides authenticated endpoints to fetch media from Klipy API:

- `GET /api/media/gifs/trending` - Get trending GIFs
- `GET /api/media/gifs/search?q={query}` - Search GIFs
- `GET /api/media/stickers/trending` - Get trending stickers
- `GET /api/media/stickers/search?q={query}` - Search stickers
- `GET /api/media/memes/trending` - Get trending memes
- `GET /api/media/memes/search?q={query}` - Search memes

All endpoints support pagination via `limit` and `offset` query parameters.

**Configuration**: Add `KLIPY_API_KEY` to `backend/.env`:

```bash
KLIPY_API_KEY=your-klipy-api-key
```

Get your API key from: https://docs.klipy.com/getting-started

### Frontend Service

**Service**: `messenger/src/lib/services/media-service.ts`

Provides functions to interact with the backend media API:
- `getTrendingGifs(limit, offset)`
- `searchGifs(query, limit, offset)`
- `getTrendingStickers(limit, offset)`
- `searchStickers(query, limit, offset)`
- `getTrendingMemes(limit, offset)`
- `searchMemes(query, limit, offset)`

**Hooks**: `messenger/src/lib/hooks/media-hooks.ts`

React Query hooks for data fetching:
- `useTrendingGifs(limit, offset)`
- `useSearchGifs(query, limit, offset)`
- `useTrendingStickers(limit, offset)`
- `useSearchStickers(query, limit, offset)`
- `useTrendingMemes(limit, offset)`
- `useSearchMemes(query, limit, offset)`

### UI Component

**Component**: `messenger/src/components/winks-picker.tsx`

A dropdown picker that displays:
- Three tabs: GIFs, Stickers, Memes
- Search bar for each media type
- Grid of media items (3 columns)
- Trending content by default, search results when query is entered

### Chat Window Integration

**Component**: `messenger/src/components/windows/chat-window.tsx`

The Winks button in the chat toolbar opens the `WinksPicker` component. When a user selects media:

1. Sends a message with `messageType: 'wink'`
2. Stores the media URL in `metadata.winkUrl`
3. Stores the media type in `metadata.winkType`

Messages with winks are rendered as images in the chat history.

### Wink Overlay System

**Store**: `messenger/src/lib/store/wink-store.ts`

Manages a queue of winks to display:
- `winkQueue` - Array of pending winks to show
- `currentWink` - The wink currently being displayed
- `addWink()` - Adds a wink to the queue
- `removeCurrentWink()` - Removes current wink and processes next in queue
- `processQueue()` - Displays the next wink if available

**Component**: `messenger/src/components/wink-overlay.tsx`

Displays winks as full-screen overlays:
- Shows winks one at a time from the queue
- Static images (stickers, memes): Display for 3 seconds after loading
- GIFs: Display for estimated duration (3 seconds default)
- Timer starts when image loads, not when overlay appears
- Automatically processes next wink in queue after current one finishes
- Fade-in animation for smooth appearance

## Data Flow

### Sending a Wink

1. User clicks "Winks" button in chat toolbar
2. `WinksPicker` component opens, fetching trending media via React Query hooks
3. User can search (debounced 500ms) or browse media
4. On selection, `handleWinkSelect` sends a message with wink metadata
5. Message is stored in database with `message_type = 'wink'`
6. Chat window renders wink messages as images in chat history

### Receiving a Wink

1. Real-time message arrives via `useConversationRealtimeUpdates`
2. If message type is `'wink'`, it's added to the wink queue via `addWink()`
3. `WinkOverlay` component displays the wink if no other wink is showing
4. Image loads and timer starts based on media type:
   - Static images: 3 seconds
   - GIFs: 3 seconds (estimated duration)
5. After timer expires, `removeCurrentWink()` is called
6. Next wink in queue is automatically displayed (if any)

## Message Type

Added new message type `'wink'` to:
- `messenger/src/types/index.ts` - `MessageType`
- `messenger/src/types/database.ts` - `MessageType`
- `messenger/src/lib/services/message-service.ts` - `SendMessageData`

## Metadata Schema

Wink messages include:

```typescript
{
  messageType: 'wink',
  content: 'Sent a gif', // or 'sticker', 'meme'
  metadata: {
    winkUrl: string,      // URL to the media
    winkType: 'gif' | 'sticker' | 'meme'
  }
}
```

## Usage

1. Open a chat conversation
2. Click the "Winks" button in the toolbar (next to Voice Clip)
3. Browse trending content or search
4. Click on any GIF, sticker, or meme to send it
5. The media appears in the chat as an image

## Klipy API Response Transformation

The backend transforms Klipy's nested response structure into a simpler format:

**Klipy Response:**
```json
{
  "result": true,
  "data": {
    "data": [
      {
        "id": 8041071659142944,
        "title": "Hello",
        "file": {
          "hd": { "gif": { "url": "...", "width": 498, "height": 498 } },
          "md": { "gif": { "url": "...", "width": 498, "height": 498 } },
          "sm": { "gif": { "url": "...", "width": 220, "height": 220 } },
          "xs": { "gif": { "url": "...", "width": 90, "height": 90 } }
        }
      }
    ],
    "has_next": true
  }
}
```

**Transformed Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "8041071659142944",
        "url": "...",
        "preview": "...",
        "title": "Hello",
        "width": 498,
        "height": 498
      }
    ],
    "hasNext": true
  }
}
```

The transformation:
- Uses `md` (medium) quality for main URL, falls back to `hd` (high definition)
- Uses `sm` (small) quality for preview, falls back to `xs` (extra small)
- For GIFs: uses `.gif` format
- For stickers: uses `.webp` format
- For memes: uses `.jpg` format

## API Attribution

Powered by Klipy API (https://klipy.com)
