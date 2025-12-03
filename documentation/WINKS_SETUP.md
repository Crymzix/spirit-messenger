# Winks Feature Setup Guide

## Quick Setup

### 1. Get Klipy API Key

1. Visit https://docs.klipy.com/getting-started
2. Create an account and generate an API key
3. Copy your API key

### 2. Configure Backend

Add the API key to your backend `.env` file:

```bash
# backend/.env
KLIPY_API_KEY=your-klipy-api-key-here
```

### 3. Restart Backend Server

```bash
cd backend
npm run dev
```

The media routes will now be available at:
- `/api/media/gifs/trending`
- `/api/media/gifs/search`
- `/api/media/stickers/trending`
- `/api/media/stickers/search`
- `/api/media/memes/trending`
- `/api/media/memes/search`

### 4. Test the Feature

1. Start the messenger app: `cd messenger && npm run tauri dev`
2. Open a chat conversation
3. Click the "Winks" button in the chat toolbar
4. Browse or search for GIFs, stickers, or memes
5. Click to send

## Troubleshooting

### "Failed to fetch trending GIFs"

- Check that `KLIPY_API_KEY` is set in `backend/.env`
- Verify the API key is valid
- Check backend logs for API errors

### Winks button not showing picker

- Check browser console for errors
- Verify backend is running and accessible
- Check that authentication token is valid

### Images not displaying

- Check that the Klipy API is returning valid URLs
- Verify network connectivity
- Check browser console for CORS or loading errors

## API Rate Limits

Klipy API has rate limits. For production use:
- Implement caching for trending results
- Add debouncing to search queries
- Consider upgrading to a paid Klipy plan for higher limits
