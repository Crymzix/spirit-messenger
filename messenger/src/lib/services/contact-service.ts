/**
 * Contact service for contact management
 * Handles contact requests, acceptance, and removal
 * 
 * Architecture:
 * - Write operations: All contact operations go through Backend Service API
 * - Read operations: Frontend reads directly from Supabase for real-time updates
 * - Real-time sync: Supabase Realtime WebSocket subscriptions notify UI of changes
 */

import { apiPost, apiDelete, apiGet } from '../api-client';
import type { Contact } from '@/types';

export interface ContactRequestData {
    contactEmail: string;
}

export interface ContactRequestResponse {
    contactRequest: Contact;
}

export interface AcceptContactData {
    requestId: string;
}

export interface AcceptContactResponse {
    contact: Contact;
}

export interface DeclineContactData {
    requestId: string;
}

export interface GetContactsResponse {
    contacts: Contact[];
}

export interface PendingRequestsResponse {
    requests: any[];
}

/**
 * Send a contact request to another user by email
 */
export async function sendContactRequest(
    contactEmail: string
): Promise<ContactRequestResponse> {
    const response = await apiPost<ContactRequestResponse>(
        '/api/contacts/request',
        { contactEmail }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to send contact request');
    }

    return response.data;
}

/**
 * Accept a contact request
 */
export async function acceptContactRequest(
    requestId: string
): Promise<AcceptContactResponse> {
    const response = await apiPost<AcceptContactResponse>(
        '/api/contacts/accept',
        { requestId }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to accept contact request');
    }

    return response.data;
}

/**
 * Decline a contact request
 */
export async function declineContactRequest(
    requestId: string
): Promise<{ success: boolean }> {
    const response = await apiPost<{ success: boolean }>(
        '/api/contacts/decline',
        { requestId }
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to decline contact request');
    }

    return response.data;
}

/**
 * Remove a contact
 */
export async function removeContact(
    contactId: string
): Promise<{ success: boolean }> {
    const response = await apiDelete<{ success: boolean }>(
        `/api/contacts/${contactId}`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to remove contact');
    }

    return response.data;
}

/**
 * Get all contacts for the authenticated user
 */
export async function getContacts(
    status?: 'pending' | 'accepted' | 'blocked'
): Promise<GetContactsResponse> {
    const endpoint = status ? `/api/contacts?status=${status}` : '/api/contacts';

    const response = await apiGet<GetContactsResponse>(
        endpoint
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch contacts');
    }

    return response.data;
}

/**
 * Get pending contact requests
 */
export async function getPendingRequests(): Promise<PendingRequestsResponse> {
    const response = await apiGet<PendingRequestsResponse>(
        '/api/contacts/pending'
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch pending requests');
    }

    return response.data;
}

/**
 * Search for a user by email (using Supabase direct read)
 * This is used to validate if a user exists before sending a contact request
 */
export async function searchUserByEmail(
    email: string
): Promise<{ exists: boolean; username?: string; displayName?: string }> {
    // Note: This could be implemented as a direct Supabase query or as a backend endpoint
    // For now, we'll rely on the backend to validate the email when sending the request
    // The backend will return an error if the user doesn't exist

    // This is a placeholder that always returns exists: true
    // The actual validation happens on the backend
    return { exists: true };
}
