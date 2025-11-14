import { eq, and, or } from 'drizzle-orm';
import { db } from '../db/client.js';
import { contacts, SelectContact, InsertContact, users, SelectUser } from '../db/schema.js';

/**
 * Contact Service
 * Handles contact requests, acceptance, decline, and removal
 */

export interface CreateContactRequestData {
    contactEmail: string;
}

export interface ContactWithUser extends SelectContact {
    contactUser: SelectUser;
}

export class ContactServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'ContactServiceError';
    }
}

/**
 * Create a contact request
 * Sends a contact request from one user to another by email
 */
export async function createContactRequest(
    userId: string,
    data: CreateContactRequestData
): Promise<SelectContact> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.contactEmail) {
            throw new ContactServiceError('Contact email is required', 'MISSING_CONTACT_EMAIL', 400);
        }

        if (typeof data.contactEmail !== 'string') {
            throw new ContactServiceError('Contact email must be a string', 'INVALID_CONTACT_EMAIL', 400);
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail)) {
            throw new ContactServiceError('Invalid email format', 'INVALID_EMAIL_FORMAT', 400);
        }

        // Find the contact user by email
        const [contactUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, data.contactEmail))
            .limit(1);

        if (!contactUser) {
            throw new ContactServiceError('User with this email not found', 'USER_NOT_FOUND', 404);
        }

        // Check if user is trying to add themselves
        if (contactUser.id === userId) {
            throw new ContactServiceError('Cannot add yourself as a contact', 'CANNOT_ADD_SELF', 400);
        }

        // Check if contact request already exists (in either direction)
        const existingContact = await db
            .select()
            .from(contacts)
            .where(
                or(
                    and(
                        eq(contacts.userId, userId),
                        eq(contacts.contactUserId, contactUser.id)
                    ),
                    and(
                        eq(contacts.userId, contactUser.id),
                        eq(contacts.contactUserId, userId)
                    )
                )
            )
            .limit(1);

        if (existingContact.length > 0) {
            const existing = existingContact[0];
            if (existing.status === 'accepted') {
                throw new ContactServiceError('Contact already exists', 'CONTACT_ALREADY_EXISTS', 409);
            } else if (existing.status === 'pending') {
                throw new ContactServiceError('Contact request already pending', 'REQUEST_ALREADY_PENDING', 409);
            } else if (existing.status === 'blocked') {
                throw new ContactServiceError('Cannot add blocked contact', 'CONTACT_BLOCKED', 403);
            }
        }

        // Create contact request
        const contactData: InsertContact = {
            userId,
            contactUserId: contactUser.id,
            status: 'pending',
        };

        const [newContact] = await db
            .insert(contacts)
            .values(contactData)
            .returning();

        if (!newContact) {
            throw new ContactServiceError('Failed to create contact request', 'CREATE_REQUEST_FAILED', 500);
        }

        return newContact;
    } catch (error) {
        if (error instanceof ContactServiceError) {
            throw error;
        }
        throw new ContactServiceError(
            'Failed to create contact request',
            'CREATE_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Accept a contact request
 * Changes the status of a pending contact request to 'accepted'
 */
export async function acceptContactRequest(
    userId: string,
    contactId: string
): Promise<SelectContact> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!contactId) {
            throw new ContactServiceError('Contact ID is required', 'INVALID_CONTACT_ID', 400);
        }

        // Find the contact request
        const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);

        if (!contact) {
            throw new ContactServiceError('Contact request not found', 'CONTACT_NOT_FOUND', 404);
        }

        // Verify that the current user is the recipient of the request
        if (contact.contactUserId !== userId) {
            throw new ContactServiceError(
                'You can only accept contact requests sent to you',
                'UNAUTHORIZED_ACCEPT',
                403
            );
        }

        // Check if request is pending
        if (contact.status !== 'pending') {
            throw new ContactServiceError(
                `Cannot accept contact request with status: ${contact.status}`,
                'INVALID_STATUS',
                400
            );
        }

        // Update contact status to accepted
        const [updatedContact] = await db
            .update(contacts)
            .set({
                status: 'accepted',
                updatedAt: new Date(),
            })
            .where(eq(contacts.id, contactId))
            .returning();

        if (!updatedContact) {
            throw new ContactServiceError('Failed to accept contact request', 'ACCEPT_REQUEST_FAILED', 500);
        }

        return updatedContact;
    } catch (error) {
        if (error instanceof ContactServiceError) {
            throw error;
        }
        throw new ContactServiceError(
            'Failed to accept contact request',
            'ACCEPT_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Decline a contact request
 * Deletes a pending contact request
 */
export async function declineContactRequest(
    userId: string,
    contactId: string
): Promise<void> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!contactId) {
            throw new ContactServiceError('Contact ID is required', 'INVALID_CONTACT_ID', 400);
        }

        // Find the contact request
        const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);

        if (!contact) {
            throw new ContactServiceError('Contact request not found', 'CONTACT_NOT_FOUND', 404);
        }

        // Verify that the current user is the recipient of the request
        if (contact.contactUserId !== userId) {
            throw new ContactServiceError(
                'You can only decline contact requests sent to you',
                'UNAUTHORIZED_DECLINE',
                403
            );
        }

        // Check if request is pending
        if (contact.status !== 'pending') {
            throw new ContactServiceError(
                `Cannot decline contact request with status: ${contact.status}`,
                'INVALID_STATUS',
                400
            );
        }

        // Delete the contact request
        await db
            .delete(contacts)
            .where(eq(contacts.id, contactId));

    } catch (error) {
        if (error instanceof ContactServiceError) {
            throw error;
        }
        throw new ContactServiceError(
            'Failed to decline contact request',
            'DECLINE_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Remove a contact
 * Deletes an accepted contact relationship
 */
export async function removeContact(
    userId: string,
    contactId: string
): Promise<void> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!contactId) {
            throw new ContactServiceError('Contact ID is required', 'INVALID_CONTACT_ID', 400);
        }

        // Find the contact
        const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);

        if (!contact) {
            throw new ContactServiceError('Contact not found', 'CONTACT_NOT_FOUND', 404);
        }

        // Verify that the current user is part of this contact relationship
        if (contact.userId !== userId && contact.contactUserId !== userId) {
            throw new ContactServiceError(
                'You can only remove your own contacts',
                'UNAUTHORIZED_REMOVE',
                403
            );
        }

        // Delete the contact
        await db
            .delete(contacts)
            .where(eq(contacts.id, contactId));

    } catch (error) {
        if (error instanceof ContactServiceError) {
            throw error;
        }
        throw new ContactServiceError(
            'Failed to remove contact',
            'REMOVE_CONTACT_FAILED',
            500
        );
    }
}

/**
 * Get all contacts for a user
 * Returns contacts with their user information
 */
export async function getUserContacts(
    userId: string,
    status?: 'pending' | 'accepted' | 'blocked'
): Promise<ContactWithUser[]> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Build query conditions
        const conditions = [
            or(
                eq(contacts.userId, userId),
                eq(contacts.contactUserId, userId)
            )
        ];

        if (status) {
            conditions.push(eq(contacts.status, status));
        }

        // Get contacts with user information
        const userContacts = await db
            .select({
                id: contacts.id,
                userId: contacts.userId,
                contactUserId: contacts.contactUserId,
                status: contacts.status,
                createdAt: contacts.createdAt,
                updatedAt: contacts.updatedAt,
                contactUser: users,
            })
            .from(contacts)
            .innerJoin(
                users,
                or(
                    and(
                        eq(contacts.contactUserId, users.id),
                        eq(contacts.userId, userId)
                    ),
                    and(
                        eq(contacts.userId, users.id),
                        eq(contacts.contactUserId, userId)
                    )
                )
            )
            .where(and(...conditions));

        return userContacts as ContactWithUser[];
    } catch (error) {
        if (error instanceof ContactServiceError) {
            throw error;
        }
        throw new ContactServiceError(
            'Failed to get user contacts',
            'GET_CONTACTS_FAILED',
            500
        );
    }
}

/**
 * Get pending contact requests received by a user
 * Returns requests where the user is the recipient
 */
export async function getPendingContactRequests(userId: string): Promise<ContactWithUser[]> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Get pending requests where user is the recipient
        const pendingRequests = await db
            .select({
                id: contacts.id,
                userId: contacts.userId,
                contactUserId: contacts.contactUserId,
                status: contacts.status,
                createdAt: contacts.createdAt,
                updatedAt: contacts.updatedAt,
                contactUser: users,
            })
            .from(contacts)
            .innerJoin(users, eq(contacts.userId, users.id))
            .where(
                and(
                    eq(contacts.contactUserId, userId),
                    eq(contacts.status, 'pending')
                )
            );

        return pendingRequests as ContactWithUser[];
    } catch (error) {
        if (error instanceof ContactServiceError) {
            throw error;
        }
        throw new ContactServiceError(
            'Failed to get pending contact requests',
            'GET_PENDING_REQUESTS_FAILED',
            500
        );
    }
}

/**
 * Get a specific contact by ID
 */
export async function getContactById(contactId: string): Promise<SelectContact | null> {
    try {
        if (!contactId) {
            throw new ContactServiceError('Contact ID is required', 'INVALID_CONTACT_ID', 400);
        }

        const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);

        return contact || null;
    } catch (error) {
        if (error instanceof ContactServiceError) {
            throw error;
        }
        throw new ContactServiceError(
            'Failed to get contact',
            'GET_CONTACT_FAILED',
            500
        );
    }
}
