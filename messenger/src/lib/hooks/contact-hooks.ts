/**
 * Contact hooks for managing contact requests and subscriptions
 * Provides real-time updates via Supabase subscriptions
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { getPendingRequests } from '../services/contact-service';
import { useAuthStore } from '../store/auth-store';
import type { Contact } from '@/types';

/**
 * Hook to fetch and subscribe to pending contact requests
 * Returns pending requests and loading state
 */
export function usePendingContactRequests() {
    const [pendingRequests, setPendingRequests] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (!token || !user) {
            setPendingRequests([]);
            setIsLoading(false);
            return;
        }

        // Fetch initial pending requests
        const fetchPendingRequests = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await getPendingRequests(token);
                setPendingRequests(response.requests || []);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending requests';
                setError(errorMessage);
                console.error('Error fetching pending requests:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPendingRequests();

        // Subscribe to contacts table changes for real-time updates
        const channel = supabase
            .channel('pending-contact-requests')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contacts',
                    filter: `contact_user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Contact request change:', payload);

                    if (payload.eventType === 'INSERT') {
                        // New contact request received
                        const newContact = payload.new as any;
                        if (newContact.status === 'pending') {
                            // Fetch the complete contact with user info
                            fetchPendingRequests();
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        // Contact request status changed
                        const updatedContact = payload.new as any;
                        if (updatedContact.status !== 'pending') {
                            // Request was accepted or declined, remove from list
                            setPendingRequests((prev) =>
                                prev.filter((req) => req.id !== updatedContact.id)
                            );
                        }
                    } else if (payload.eventType === 'DELETE') {
                        // Contact request was deleted
                        const deletedContact = payload.old as any;
                        setPendingRequests((prev) =>
                            prev.filter((req) => req.id !== deletedContact.id)
                        );
                    }
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [token, user]);

    return {
        pendingRequests,
        isLoading,
        error,
        refetch: async () => {
            if (token) {
                try {
                    const response = await getPendingRequests(token);
                    setPendingRequests(response.requests || []);
                } catch (err) {
                    console.error('Error refetching pending requests:', err);
                }
            }
        },
    };
}
