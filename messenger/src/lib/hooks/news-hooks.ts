/**
 * News hooks for fetching and managing top headlines
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTopHeadlines, refreshTopHeadlines, type TopHeadlinesResponse } from '../services/news-service';

/**
 * Hook to fetch top headlines
 * Returns headlines and loading/error state
 */
export function useTopHeadlines() {
    const {
        data,
        isLoading,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ['headlines'],
        queryFn: () => getTopHeadlines(),
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
        gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    return {
        headlines: data,
        isLoading,
        error: error ? (error instanceof Error ? error.message : 'Failed to fetch headlines') : null,
        refetch,
        isFetching,
    };
}

/**
 * Hook to refresh headlines (bypass cache)
 */
export function useRefreshHeadlines() {
    const queryClient = useQueryClient();

    const { mutate, isPending, error } = useMutation({
        mutationFn: () => refreshTopHeadlines(),
        onSuccess: (data) => {
            queryClient.setQueryData(['headlines'], data);
        },
    });

    return {
        refresh: mutate,
        isRefreshing: isPending,
        error: error ? (error instanceof Error ? error.message : 'Failed to refresh headlines') : null,
    };
}
