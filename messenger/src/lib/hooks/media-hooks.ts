/**
 * React Query hooks for media (GIFs, stickers, memes)
 */

import { useQuery } from '@tanstack/react-query';
import * as mediaService from '../services/media-service';

/**
 * Hook to fetch trending GIFs
 */
export function useTrendingGifs(limit = 20, offset = 0) {
    return useQuery({
        queryKey: ['media', 'gifs', 'trending', limit, offset],
        queryFn: () => mediaService.getTrendingGifs(limit, offset),
    });
}

/**
 * Hook to search GIFs
 */
export function useSearchGifs(enabled: boolean, query: string, limit = 20, offset = 0) {
    return useQuery({
        queryKey: ['media', 'gifs', 'search', query, limit, offset],
        queryFn: () => mediaService.searchGifs(query, limit, offset),
        enabled,
    });
}

/**
 * Hook to fetch trending stickers
 */
export function useTrendingStickers(limit = 20, offset = 0) {
    return useQuery({
        queryKey: ['media', 'stickers', 'trending', limit, offset],
        queryFn: () => mediaService.getTrendingStickers(limit, offset),
    });
}

/**
 * Hook to search stickers
 */
export function useSearchStickers(enabled: boolean, query: string, limit = 20, offset = 0) {
    return useQuery({
        queryKey: ['media', 'stickers', 'search', query, limit, offset],
        queryFn: () => mediaService.searchStickers(query, limit, offset),
        enabled,
    });
}

/**
 * Hook to fetch trending memes
 */
export function useTrendingMemes(limit = 20, offset = 0) {
    return useQuery({
        queryKey: ['media', 'memes', 'trending', limit, offset],
        queryFn: () => mediaService.getTrendingMemes(limit, offset),
    });
}

/**
 * Hook to search memes
 */
export function useSearchMemes(enabled: boolean, query: string, limit = 20, offset = 0) {
    return useQuery({
        queryKey: ['media', 'memes', 'search', query, limit, offset],
        queryFn: () => mediaService.searchMemes(query, limit, offset),
        enabled,
    });
}
