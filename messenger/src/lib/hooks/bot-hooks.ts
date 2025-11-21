/**
 * Bot hooks for fetching and managing AI bots
 */

import { useQuery } from '@tanstack/react-query';
import { getBots } from '../services/bot-service';
import { useAuthStore } from '../store/auth-store';

/**
 * Hook for fetching all available bots
 */
export function useBots() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await getBots();
            return response.bots;
        },
        enabled: isAuthenticated,
    });
}
