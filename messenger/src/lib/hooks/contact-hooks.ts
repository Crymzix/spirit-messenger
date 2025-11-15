/**
 * Contact hooks for managing contact requests and subscriptions
 * Provides real-time updates via Supabase subscriptions
 */

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import {
    getPendingRequests,
    sendContactRequest,
    removeContact,
    acceptContactRequest,
    declineContactRequest,
    getContacts,
    searchUserByEmail
} from '../services/contact-service';
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

/**
 * Hook for sending a contact request
 */
export function useSendContactRequest() {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: async (contactEmail: string) => {
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await sendContactRequest(contactEmail, token);
            return response;
        },
        onSuccess: () => {
            // Invalidate contacts queries to refetch the updated list
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
}

/**
 * Hook for removing a contact
 */
export function useRemoveContact() {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: async (contactId: string) => {
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await removeContact(contactId, token);
            return response;
        },
        onSuccess: () => {
            // Invalidate contacts queries to refetch the updated list
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
}

/**
 * Hook for accepting a contact request
 */
export function useAcceptContactRequest() {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: async (requestId: string) => {
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await acceptContactRequest(requestId, token);
            return response;
        },
        onSuccess: () => {
            // Invalidate contacts queries to refetch the updated list
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
}

/**
 * Hook for declining a contact request
 */
export function useDeclineContactRequest() {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    return useMutation({
        mutationFn: async (requestId: string) => {
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await declineContactRequest(requestId, token);
            return response;
        },
        onSuccess: () => {
            // Invalidate contacts queries to refetch the updated list
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
}

/**
 * Hook for fetching contacts with optional status filter
 */
export function useContacts(status?: 'pending' | 'accepted' | 'blocked') {
    const token = useAuthStore((state) => state.token);

    return useQuery({
        queryKey: ['contacts', status],
        queryFn: async () => {
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await getContacts(token, status);
            return response.contacts;
        },
        enabled: !!token,
    });
}

/**
 * Hook for searching a user by email
 */
export function useSearchUserByEmail(email: string) {
    const token = useAuthStore((state) => state.token);

    return useQuery({
        queryKey: ['searchUser', email],
        queryFn: async () => {
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await searchUserByEmail(email, token);
            return response;
        },
        enabled: !!token && !!email && email.length > 0,
    });
}

/**
 * Hook to set up real-time contact updates
 * Subscribes to contacts table changes and invalidates React Query cache
 * Also subscribes to users table for presence status updates
 */
export function useContactRealtimeUpdates() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (!user) {
            return;
        }

        // Subscribe to contacts table changes (add/remove contacts)
        const contactsChannel = supabase
            .channel('contacts-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contacts',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Contact change detected:', payload);

                    // Invalidate contacts query to refetch updated list
                    queryClient.invalidateQueries({ queryKey: ['contacts'] });

                    if (payload.eventType === 'INSERT') {
                        console.log('New contact added');
                    } else if (payload.eventType === 'UPDATE') {
                        console.log('Contact updated');
                    } else if (payload.eventType === 'DELETE') {
                        console.log('Contact removed');
                    }
                }
            )
            .subscribe();

        // Subscribe to users table for presence status updates
        // This will update when any user's presence changes
        const presenceChannel = supabase
            .channel('presence-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                },
                (payload) => {
                    console.log('User presence change detected:', payload);

                    // Check if the updated fields include presence-related fields
                    const updatedUser = payload.new as any;
                    const oldUser = payload.old as any;

                    if (
                        updatedUser.presence_status !== oldUser.presence_status ||
                        updatedUser.personal_message !== oldUser.personal_message ||
                        updatedUser.display_name !== oldUser.display_name ||
                        updatedUser.display_picture_url !== oldUser.display_picture_url
                    ) {
                        // Invalidate contacts query to refetch with updated user info
                        queryClient.invalidateQueries({ queryKey: ['contacts'] });
                    }
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            supabase.removeChannel(contactsChannel);
            supabase.removeChannel(presenceChannel);
        };
    }, [user, queryClient]);
}
