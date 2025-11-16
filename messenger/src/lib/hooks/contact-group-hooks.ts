/**
 * Contact Group hooks for managing custom contact groups
 * Provides real-time updates via Supabase subscriptions
 * 
 * Architecture:
 * - React Query manages API state and caching
 * - Supabase Realtime provides real-time updates
 * - All mutations go through Backend Service API
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import {
    createContactGroup,
    getContactGroups,
    updateContactGroup,
    deleteContactGroup,
    reorderContactGroups,
    addContactToGroup,
    removeContactFromGroup,
} from '../services/contact-group-service';
import { useAuthStore } from '../store/auth-store';
import type { ContactGroup, ContactGroupMembership } from '@/types';
import { apiGet } from '../api-client';
import type {
    CreateContactGroupData,
    UpdateContactGroupData,
    ReorderGroupData,
} from '../services/contact-group-service';

/**
 * Query key factory for contact groups
 */
export const contactGroupKeys = {
    all: ['contact-groups'] as const,
    lists: () => [...contactGroupKeys.all, 'list'] as const,
    list: (filters?: string) => [...contactGroupKeys.lists(), { filters }] as const,
    details: () => [...contactGroupKeys.all, 'detail'] as const,
    detail: (id: string) => [...contactGroupKeys.details(), id] as const,
};

/**
 * Hook to fetch all contact groups for the authenticated user
 * Returns contact groups ordered by displayOrder
 */
export function useContactGroups() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return useQuery({
        queryKey: contactGroupKeys.lists(),
        queryFn: async () => {
            const response = await getContactGroups();
            return response.groups;
        },
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Hook for creating a new contact group
 */
export function useCreateContactGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateContactGroupData) => {
            const response = await createContactGroup(data);
            return response.group;
        },
        onSuccess: (newGroup) => {
            // Optimistically update the cache
            queryClient.setQueryData<ContactGroup[]>(
                contactGroupKeys.lists(),
                (old) => {
                    if (!old) return [newGroup];
                    return [...old, newGroup].sort((a, b) => a.displayOrder - b.displayOrder);
                }
            );

            // Invalidate to ensure consistency
            queryClient.invalidateQueries({ queryKey: contactGroupKeys.lists() });
        },
        onError: (error) => {
            console.error('Failed to create contact group:', error);
        },
    });
}

/**
 * Hook for updating a contact group (rename)
 */
export function useUpdateContactGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            data,
        }: {
            groupId: string;
            data: UpdateContactGroupData;
        }) => {
            const response = await updateContactGroup(groupId, data);
            return response.group;
        },
        onMutate: async ({ groupId, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: contactGroupKeys.lists() });

            // Snapshot previous value
            const previousGroups = queryClient.getQueryData<ContactGroup[]>(
                contactGroupKeys.lists()
            );

            // Optimistically update
            queryClient.setQueryData<ContactGroup[]>(
                contactGroupKeys.lists(),
                (old) => {
                    if (!old) return old;
                    return old.map((group) =>
                        group.id === groupId
                            ? { ...group, ...data, updatedAt: new Date() }
                            : group
                    );
                }
            );

            return { previousGroups };
        },
        onError: (error, _variables, context) => {
            // Rollback on error
            if (context?.previousGroups) {
                queryClient.setQueryData(
                    contactGroupKeys.lists(),
                    context.previousGroups
                );
            }
            console.error('Failed to update contact group:', error);
        },
        onSettled: () => {
            // Refetch after mutation
            queryClient.invalidateQueries({ queryKey: contactGroupKeys.lists() });
        },
    });
}

/**
 * Hook for deleting a contact group
 */
export function useDeleteContactGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupId: string) => {
            await deleteContactGroup(groupId);
            return groupId;
        },
        onMutate: async (groupId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: contactGroupKeys.lists() });

            // Snapshot previous value
            const previousGroups = queryClient.getQueryData<ContactGroup[]>(
                contactGroupKeys.lists()
            );

            // Optimistically remove the group
            queryClient.setQueryData<ContactGroup[]>(
                contactGroupKeys.lists(),
                (old) => {
                    if (!old) return old;
                    return old.filter((group) => group.id !== groupId);
                }
            );

            return { previousGroups };
        },
        onError: (error, _variables, context) => {
            // Rollback on error
            if (context?.previousGroups) {
                queryClient.setQueryData(
                    contactGroupKeys.lists(),
                    context.previousGroups
                );
            }
            console.error('Failed to delete contact group:', error);
        },
        onSettled: () => {
            // Refetch after mutation
            queryClient.invalidateQueries({ queryKey: contactGroupKeys.lists() });
        },
    });
}

/**
 * Hook for reordering contact groups
 */
export function useReorderContactGroups() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupOrders: ReorderGroupData[]) => {
            const response = await reorderContactGroups(groupOrders);
            return response.groups;
        },
        onMutate: async (groupOrders) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: contactGroupKeys.lists() });

            // Snapshot previous value
            const previousGroups = queryClient.getQueryData<ContactGroup[]>(
                contactGroupKeys.lists()
            );

            // Optimistically update the order
            queryClient.setQueryData<ContactGroup[]>(
                contactGroupKeys.lists(),
                (old) => {
                    if (!old) return old;

                    // Create a map of new display orders
                    const orderMap = new Map(
                        groupOrders.map((o) => [o.groupId, o.displayOrder])
                    );

                    // Update groups with new display orders
                    const updated = old.map((group) => {
                        const newOrder = orderMap.get(group.id);
                        return newOrder !== undefined
                            ? { ...group, displayOrder: newOrder }
                            : group;
                    });

                    // Sort by display order
                    return updated.sort((a, b) => a.displayOrder - b.displayOrder);
                }
            );

            return { previousGroups };
        },
        onError: (error, _variables, context) => {
            // Rollback on error
            if (context?.previousGroups) {
                queryClient.setQueryData(
                    contactGroupKeys.lists(),
                    context.previousGroups
                );
            }
            console.error('Failed to reorder contact groups:', error);
        },
        onSettled: () => {
            // Refetch after mutation
            queryClient.invalidateQueries({ queryKey: contactGroupKeys.lists() });
        },
    });
}

/**
 * Hook for adding a contact to a group
 */
export function useAddContactToGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            contactId,
        }: {
            groupId: string;
            contactId: string;
        }) => {
            const response = await addContactToGroup(groupId, contactId);
            return response.membership;
        },
        onSuccess: () => {
            // Invalidate contact groups and memberships
            queryClient.invalidateQueries({ queryKey: contactGroupKeys.all });
            queryClient.invalidateQueries({ queryKey: ['contact-group-memberships'] });
        },
        onError: (error) => {
            console.error('Failed to add contact to group:', error);
        },
    });
}

/**
 * Hook for removing a contact from a group
 */
export function useRemoveContactFromGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            contactId,
        }: {
            groupId: string;
            contactId: string;
        }) => {
            await removeContactFromGroup(groupId, contactId);
            return { groupId, contactId };
        },
        onSuccess: () => {
            // Invalidate contact groups and memberships
            queryClient.invalidateQueries({ queryKey: contactGroupKeys.all });
            queryClient.invalidateQueries({ queryKey: ['contact-group-memberships'] });
        },
        onError: (error) => {
            console.error('Failed to remove contact from group:', error);
        },
    });
}

/**
 * Hook to set up real-time contact group updates
 * Subscribes to contact_groups and contact_group_memberships table changes
 * and invalidates React Query cache when changes occur
 */
export function useContactGroupRealtimeUpdates() {
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (!user) {
            return;
        }

        // Subscribe to contact_groups table changes
        const groupsChannel = supabase
            .channel('contact-groups-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contact_groups',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Contact group change detected:', payload);

                    // Invalidate contact groups query to refetch updated list
                    queryClient.invalidateQueries({ queryKey: contactGroupKeys.lists() });

                    if (payload.eventType === 'INSERT') {
                        console.log('New contact group created');
                    } else if (payload.eventType === 'UPDATE') {
                        console.log('Contact group updated');
                    } else if (payload.eventType === 'DELETE') {
                        console.log('Contact group deleted');
                    }
                }
            )
            .subscribe();

        // Subscribe to contact_group_memberships table changes
        const membershipsChannel = supabase
            .channel('contact-group-memberships-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contact_group_memberships',
                },
                (payload) => {
                    console.log('Contact group membership change detected:', payload);

                    // Invalidate queries to refetch updated memberships
                    queryClient.invalidateQueries({ queryKey: contactGroupKeys.all });
                    queryClient.invalidateQueries({ queryKey: ['contact-group-memberships'] });

                    if (payload.eventType === 'INSERT') {
                        console.log('Contact added to group');
                    } else if (payload.eventType === 'DELETE') {
                        console.log('Contact removed from group');
                    }
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            supabase.removeChannel(groupsChannel);
            supabase.removeChannel(membershipsChannel);
        };
    }, [user, queryClient]);
}

/**
 * Hook to fetch contact group memberships
 * Returns a map of group IDs to arrays of contact IDs
 */
export function useContactGroupMemberships() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return useQuery({
        queryKey: ['contact-group-memberships'],
        queryFn: async () => {
            const response = await apiGet<{ memberships: ContactGroupMembership[] }>(
                '/api/contact-groups/memberships'
            );

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Failed to fetch contact group memberships');
            }

            // Convert array to a map for easier lookup
            const membershipMap = new Map<string, string[]>();
            response.data.memberships.forEach((membership) => {
                const contactIds = membershipMap.get(membership.groupId) || [];
                contactIds.push(membership.contactId);
                membershipMap.set(membership.groupId, contactIds);
            });

            return membershipMap;
        },
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
