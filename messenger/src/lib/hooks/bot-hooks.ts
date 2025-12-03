/**
 * Bot hooks for fetching and managing AI bots
 */

import { useQuery } from '@tanstack/react-query';
import { getBots } from '../services/bot-service';

/**
 * Hook for fetching all available bots
 */
export function useBots() {

    return useQuery({
        queryKey: ['bots'],
        queryFn: async () => {
            const response = await getBots();
            return response.bots;
        },
    });
}
