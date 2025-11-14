import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth-store';
import { setUserPresenceStatus } from '../services/presence-service';
import type { PresenceStatus } from '@/types';

/**
 * Hook for updating user presence status
 * Automatically retrieves token from auth store
 */
export function useSetPresenceStatus() {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);
    const updateUser = useAuthStore((state) => state.updateUser);

    return useMutation({
        mutationFn: async (status: PresenceStatus) => {
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await setUserPresenceStatus(status, token);
            return { status, response };
        },
        onSuccess: ({ status }) => {
            // Update Zustand store with new presence status
            updateUser({ presenceStatus: status });

            // Invalidate queries that might depend on user presence
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        },
    });
}
