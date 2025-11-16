/**
 * Contact Group service for managing custom contact groups
 * Handles group creation, updates, deletion, and membership management
 * 
 * Architecture:
 * - Write operations: All group operations go through Backend Service API
 * - Read operations: Frontend reads directly from Supabase for real-time updates
 * - Real-time sync: Supabase Realtime WebSocket subscriptions notify UI of changes
 */

import { apiPost, apiGet, apiPut, apiDelete } from '../api-client';
import type { ContactGroup, ContactGroupMembership } from '@/types';

export interface CreateContactGroupData {
    name: string;
    displayOrder?: number;
}

export interface CreateContactGroupResponse {
    group: ContactGroup;
}

export interface UpdateContactGroupData {
    name?: string;
    displayOrder?: number;
}

export interface UpdateContactGroupResponse {
    group: ContactGroup;
}

export interface GetContactGroupsResponse {
    groups: ContactGroup[];
}

export interface ReorderGroupData {
    groupId: string;
    displayOrder: number;
}

export interface ReorderContactGroupsData {
    groupOrders: ReorderGroupData[];
}

export interface ReorderContactGroupsResponse {
    groups: ContactGroup[];
}

export interface AddContactToGroupData {
    contactId: string;
}

export interface AddContactToGroupResponse {
    membership: ContactGroupMembership;
}

/**
 * Create a new contact group
 */
export async function createContactGroup(
    data: CreateContactGroupData
): Promise<CreateContactGroupResponse> {
    const response = await apiPost<CreateContactGroupResponse>(
        '/api/contact-groups',
        data
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create contact group');
    }

    return response.data;
}

/**
 * Get all contact groups for the authenticated user
 */
export async function getContactGroups(): Promise<GetContactGroupsResponse> {
    const response = await apiGet<GetContactGroupsResponse>(
        '/api/contact-groups'
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch contact groups');
    }

    return response.data;
}

/**
 * Update a contact group (rename or reorder)
 */
export async function updateContactGroup(
    groupId: string,
    data: UpdateContactGroupData
): Promise<UpdateContactGroupResponse> {
    const response = await apiPut<UpdateContactGroupResponse>(
        `/api/contact-groups/${groupId}`,
        data
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update contact group');
    }

    return response.data;
}

/**
 * Delete a contact group
 * Note: This will remove the group but not the contacts themselves
 */
export async function deleteContactGroup(
    groupId: string
): Promise<{ success: boolean }> {
    const response = await apiDelete<{ success: boolean }>(
        `/api/contact-groups/${groupId}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to delete contact group');
    }

    return response.data;
}

/**
 * Reorder multiple contact groups
 */
export async function reorderContactGroups(
    groupOrders: ReorderGroupData[]
): Promise<ReorderContactGroupsResponse> {
    const response = await apiPut<ReorderContactGroupsResponse>(
        '/api/contact-groups/reorder',
        { groupOrders }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to reorder contact groups');
    }

    return response.data;
}

/**
 * Add a contact to a group
 */
export async function addContactToGroup(
    groupId: string,
    contactId: string
): Promise<AddContactToGroupResponse> {
    const response = await apiPost<AddContactToGroupResponse>(
        `/api/contact-groups/${groupId}/contacts`,
        { contactId }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to add contact to group');
    }

    return response.data;
}

/**
 * Remove a contact from a group
 */
export async function removeContactFromGroup(
    groupId: string,
    contactId: string
): Promise<{ success: boolean }> {
    const response = await apiDelete<{ success: boolean }>(
        `/api/contact-groups/${groupId}/contacts/${contactId}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to remove contact from group');
    }

    return response.data;
}
