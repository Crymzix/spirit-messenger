import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setUserPresenceStatus } from '../services/presence-service';
import type { PresenceStatus } from '@/types';

/**
 * Hook for updating user presence status
 * Automatically retrieves token from auth store
 */
export function useSetPresenceStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (status: PresenceStatus) => {
            const response = await setUserPresenceStatus(status);
            return { status, response };
        },
        onSuccess: () => {
            // Invalidate queries that might depend on user presence
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });
}
