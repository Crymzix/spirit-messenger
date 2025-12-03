/**
 * Media service for fetching GIFs, stickers, and memes
 * Uses Klipy API through backend proxy
 */

import { apiGet } from '../api-client';

export interface MediaItem {
    id: string;
    url: string;
    preview?: string;
    title?: string;
    width?: number;
    height?: number;
}

export interface MediaResponse {
    results: MediaItem[];
    next?: string;
}

/**
 * Get trending GIFs
 */
export async function getTrendingGifs(limit = 20, offset = 0): Promise<MediaResponse> {
    const response = await apiGet<MediaResponse>(
        `/api/media/gifs/trending?limit=${limit}&offset=${offset}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch trending GIFs');
    }

    return response.data;
}

/**
 * Search GIFs
 */
export async function searchGifs(query: string, limit = 20, offset = 0): Promise<MediaResponse> {
    const response = await apiGet<MediaResponse>(
        `/api/media/gifs/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to search GIFs');
    }

    return response.data;
}

/**
 * Get trending stickers
 */
export async function getTrendingStickers(limit = 20, offset = 0): Promise<MediaResponse> {
    const response = await apiGet<MediaResponse>(
        `/api/media/stickers/trending?limit=${limit}&offset=${offset}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch trending stickers');
    }

    return response.data;
}

/**
 * Search stickers
 */
export async function searchStickers(query: string, limit = 20, offset = 0): Promise<MediaResponse> {
    const response = await apiGet<MediaResponse>(
        `/api/media/stickers/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to search stickers');
    }

    return response.data;
}

/**
 * Get trending memes
 */
export async function getTrendingMemes(limit = 20, offset = 0): Promise<MediaResponse> {
    const response = await apiGet<MediaResponse>(
        `/api/media/memes/trending?limit=${limit}&offset=${offset}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch trending memes');
    }

    return response.data;
}

/**
 * Search memes
 */
export async function searchMemes(query: string, limit = 20, offset = 0): Promise<MediaResponse> {
    const response = await apiGet<MediaResponse>(
        `/api/media/memes/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to search memes');
    }

    return response.data;
}
