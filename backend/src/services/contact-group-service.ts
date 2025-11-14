import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
    contactGroups,
    contactGroupMemberships,
    contacts,
    SelectContactGroup,
    InsertContactGroup,
    SelectContactGroupMembership,
    InsertContactGroupMembership,
} from '../db/schema.js';

/**
 * Contact Group Service
 * Handles contact group creation, updates, deletion, and membership management
 */

export interface CreateContactGroupData {
    name: string;
    displayOrder?: number;
}

export interface UpdateContactGroupData {
    name?: string;
    displayOrder?: number;
}

export interface ReorderGroupData {
    groupId: string;
    displayOrder: number;
}

export interface ContactGroupWithMemberships extends SelectContactGroup {
    memberships?: SelectContactGroupMembership[];
}

export class ContactGroupServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'ContactGroupServiceError';
    }
}

/**
 * Create a new contact group
 */
export async function createContactGroup(
    userId: string,
    data: CreateContactGroupData
): Promise<SelectContactGroup> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.name || typeof data.name !== 'string') {
            throw new ContactGroupServiceError('Group name is required and must be a string', 'INVALID_GROUP_NAME', 400);
        }

        // Validate name length (max 50 characters per requirements)
        if (data.name.length > 50) {
            throw new ContactGroupServiceError('Group name must not exceed 50 characters', 'NAME_TOO_LONG', 400);
        }

        if (data.name.trim().length === 0) {
            throw new ContactGroupServiceError('Group name cannot be empty', 'EMPTY_GROUP_NAME', 400);
        }

        // If displayOrder is not provided, get the next available order
        let displayOrder = data.displayOrder ?? 0;
        if (displayOrder === undefined || displayOrder === null) {
            const existingGroups = await db
                .select()
                .from(contactGroups)
                .where(eq(contactGroups.userId, userId));

            displayOrder = existingGroups.length > 0
                ? Math.max(...existingGroups.map(g => g.displayOrder ?? 0)) + 1
                : 0;
        }

        // Create contact group
        const groupData: InsertContactGroup = {
            userId,
            name: data.name.trim(),
            displayOrder,
        };

        const [newGroup] = await db
            .insert(contactGroups)
            .values(groupData)
            .returning();

        if (!newGroup) {
            throw new ContactGroupServiceError('Failed to create contact group', 'CREATE_GROUP_FAILED', 500);
        }

        return newGroup;
    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to create contact group',
            'CREATE_GROUP_FAILED',
            500
        );
    }
}

/**
 * Get all contact groups for a user
 */
export async function getUserContactGroups(
    userId: string,
    includeMemberships: boolean = false
): Promise<ContactGroupWithMemberships[]> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Get all groups for the user, ordered by displayOrder
        const groups = await db
            .select()
            .from(contactGroups)
            .where(eq(contactGroups.userId, userId))
            .orderBy(contactGroups.displayOrder);

        if (!includeMemberships) {
            return groups;
        }

        // Get memberships for all groups
        const groupIds = groups.map(g => g.id);

        if (groupIds.length === 0) {
            return groups;
        }

        const memberships = await db
            .select()
            .from(contactGroupMemberships)
            .where(inArray(contactGroupMemberships.groupId, groupIds));

        // Attach memberships to groups
        const groupsWithMemberships = groups.map(group => ({
            ...group,
            memberships: memberships.filter(m => m.groupId === group.id),
        }));

        return groupsWithMemberships;
    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to get user contact groups',
            'GET_GROUPS_FAILED',
            500
        );
    }
}

/**
 * Get a specific contact group by ID
 */
export async function getContactGroupById(
    groupId: string,
    userId: string
): Promise<SelectContactGroup | null> {
    try {
        if (!groupId) {
            throw new ContactGroupServiceError('Group ID is required', 'INVALID_GROUP_ID', 400);
        }

        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        const [group] = await db
            .select()
            .from(contactGroups)
            .where(
                and(
                    eq(contactGroups.id, groupId),
                    eq(contactGroups.userId, userId)
                )
            )
            .limit(1);

        return group || null;
    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to get contact group',
            'GET_GROUP_FAILED',
            500
        );
    }
}

/**
 * Update a contact group
 */
export async function updateContactGroup(
    groupId: string,
    userId: string,
    data: UpdateContactGroupData
): Promise<SelectContactGroup> {
    try {
        // Validate input
        if (!groupId) {
            throw new ContactGroupServiceError('Group ID is required', 'INVALID_GROUP_ID', 400);
        }

        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.name && data.displayOrder === undefined) {
            throw new ContactGroupServiceError('At least one field must be provided for update', 'NO_UPDATE_DATA', 400);
        }

        // Verify group exists and belongs to user
        const group = await getContactGroupById(groupId, userId);
        if (!group) {
            throw new ContactGroupServiceError('Contact group not found', 'GROUP_NOT_FOUND', 404);
        }

        // Prepare update data
        const updateData: Partial<InsertContactGroup> = {
            updatedAt: new Date(),
        };

        if (data.name !== undefined) {
            if (typeof data.name !== 'string') {
                throw new ContactGroupServiceError('Group name must be a string', 'INVALID_GROUP_NAME', 400);
            }

            if (data.name.length > 50) {
                throw new ContactGroupServiceError('Group name must not exceed 50 characters', 'NAME_TOO_LONG', 400);
            }

            if (data.name.trim().length === 0) {
                throw new ContactGroupServiceError('Group name cannot be empty', 'EMPTY_GROUP_NAME', 400);
            }

            updateData.name = data.name.trim();
        }

        if (data.displayOrder !== undefined) {
            if (typeof data.displayOrder !== 'number') {
                throw new ContactGroupServiceError('Display order must be a number', 'INVALID_DISPLAY_ORDER', 400);
            }
            updateData.displayOrder = data.displayOrder;
        }

        // Update the group
        const [updatedGroup] = await db
            .update(contactGroups)
            .set(updateData)
            .where(
                and(
                    eq(contactGroups.id, groupId),
                    eq(contactGroups.userId, userId)
                )
            )
            .returning();

        if (!updatedGroup) {
            throw new ContactGroupServiceError('Failed to update contact group', 'UPDATE_GROUP_FAILED', 500);
        }

        return updatedGroup;
    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to update contact group',
            'UPDATE_GROUP_FAILED',
            500
        );
    }
}

/**
 * Delete a contact group
 * Note: This will cascade delete all memberships due to foreign key constraint
 */
export async function deleteContactGroup(
    groupId: string,
    userId: string
): Promise<void> {
    try {
        // Validate input
        if (!groupId) {
            throw new ContactGroupServiceError('Group ID is required', 'INVALID_GROUP_ID', 400);
        }

        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Verify group exists and belongs to user
        const group = await getContactGroupById(groupId, userId);
        if (!group) {
            throw new ContactGroupServiceError('Contact group not found', 'GROUP_NOT_FOUND', 404);
        }

        // Delete the group (memberships will be cascade deleted)
        await db
            .delete(contactGroups)
            .where(
                and(
                    eq(contactGroups.id, groupId),
                    eq(contactGroups.userId, userId)
                )
            );

    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to delete contact group',
            'DELETE_GROUP_FAILED',
            500
        );
    }
}

/**
 * Reorder multiple contact groups
 */
export async function reorderContactGroups(
    userId: string,
    groupOrders: ReorderGroupData[]
): Promise<SelectContactGroup[]> {
    try {
        // Validate input
        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!Array.isArray(groupOrders) || groupOrders.length === 0) {
            throw new ContactGroupServiceError('Group orders array is required', 'INVALID_GROUP_ORDERS', 400);
        }

        // Validate each group order entry
        for (const order of groupOrders) {
            if (!order.groupId || typeof order.groupId !== 'string') {
                throw new ContactGroupServiceError('Each group order must have a valid groupId', 'INVALID_GROUP_ID', 400);
            }
            if (typeof order.displayOrder !== 'number') {
                throw new ContactGroupServiceError('Each group order must have a valid displayOrder number', 'INVALID_DISPLAY_ORDER', 400);
            }
        }

        // Verify all groups belong to the user
        const groupIds = groupOrders.map(o => o.groupId);
        const groups = await db
            .select()
            .from(contactGroups)
            .where(
                and(
                    inArray(contactGroups.id, groupIds),
                    eq(contactGroups.userId, userId)
                )
            );

        if (groups.length !== groupIds.length) {
            throw new ContactGroupServiceError('One or more groups not found or do not belong to user', 'GROUPS_NOT_FOUND', 404);
        }

        // Update each group's display order
        const updatedGroups: SelectContactGroup[] = [];

        for (const order of groupOrders) {
            const [updatedGroup] = await db
                .update(contactGroups)
                .set({
                    displayOrder: order.displayOrder,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(contactGroups.id, order.groupId),
                        eq(contactGroups.userId, userId)
                    )
                )
                .returning();

            if (updatedGroup) {
                updatedGroups.push(updatedGroup);
            }
        }

        return updatedGroups;
    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to reorder contact groups',
            'REORDER_GROUPS_FAILED',
            500
        );
    }
}

/**
 * Add a contact to a group
 */
export async function addContactToGroup(
    groupId: string,
    contactId: string,
    userId: string
): Promise<SelectContactGroupMembership> {
    try {
        // Validate input
        if (!groupId) {
            throw new ContactGroupServiceError('Group ID is required', 'INVALID_GROUP_ID', 400);
        }

        if (!contactId) {
            throw new ContactGroupServiceError('Contact ID is required', 'INVALID_CONTACT_ID', 400);
        }

        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Verify group exists and belongs to user
        const group = await getContactGroupById(groupId, userId);
        if (!group) {
            throw new ContactGroupServiceError('Contact group not found', 'GROUP_NOT_FOUND', 404);
        }

        // Verify contact exists and belongs to user
        const [contact] = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);

        if (!contact) {
            throw new ContactGroupServiceError('Contact not found', 'CONTACT_NOT_FOUND', 404);
        }

        // Verify the contact belongs to the user
        if (contact.userId !== userId && contact.contactUserId !== userId) {
            throw new ContactGroupServiceError('Contact does not belong to user', 'UNAUTHORIZED_CONTACT', 403);
        }

        // Check if membership already exists
        const [existingMembership] = await db
            .select()
            .from(contactGroupMemberships)
            .where(
                and(
                    eq(contactGroupMemberships.groupId, groupId),
                    eq(contactGroupMemberships.contactId, contactId)
                )
            )
            .limit(1);

        if (existingMembership) {
            throw new ContactGroupServiceError('Contact is already in this group', 'MEMBERSHIP_EXISTS', 409);
        }

        // Create membership
        const membershipData: InsertContactGroupMembership = {
            groupId,
            contactId,
        };

        const [newMembership] = await db
            .insert(contactGroupMemberships)
            .values(membershipData)
            .returning();

        if (!newMembership) {
            throw new ContactGroupServiceError('Failed to add contact to group', 'ADD_CONTACT_FAILED', 500);
        }

        return newMembership;
    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to add contact to group',
            'ADD_CONTACT_FAILED',
            500
        );
    }
}

/**
 * Remove a contact from a group
 */
export async function removeContactFromGroup(
    groupId: string,
    contactId: string,
    userId: string
): Promise<void> {
    try {
        // Validate input
        if (!groupId) {
            throw new ContactGroupServiceError('Group ID is required', 'INVALID_GROUP_ID', 400);
        }

        if (!contactId) {
            throw new ContactGroupServiceError('Contact ID is required', 'INVALID_CONTACT_ID', 400);
        }

        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Verify group exists and belongs to user
        const group = await getContactGroupById(groupId, userId);
        if (!group) {
            throw new ContactGroupServiceError('Contact group not found', 'GROUP_NOT_FOUND', 404);
        }

        // Verify membership exists
        const [membership] = await db
            .select()
            .from(contactGroupMemberships)
            .where(
                and(
                    eq(contactGroupMemberships.groupId, groupId),
                    eq(contactGroupMemberships.contactId, contactId)
                )
            )
            .limit(1);

        if (!membership) {
            throw new ContactGroupServiceError('Contact is not in this group', 'MEMBERSHIP_NOT_FOUND', 404);
        }

        // Delete the membership
        await db
            .delete(contactGroupMemberships)
            .where(
                and(
                    eq(contactGroupMemberships.groupId, groupId),
                    eq(contactGroupMemberships.contactId, contactId)
                )
            );

    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to remove contact from group',
            'REMOVE_CONTACT_FAILED',
            500
        );
    }
}

/**
 * Get all memberships for a specific group
 */
export async function getGroupMemberships(
    groupId: string,
    userId: string
): Promise<SelectContactGroupMembership[]> {
    try {
        // Validate input
        if (!groupId) {
            throw new ContactGroupServiceError('Group ID is required', 'INVALID_GROUP_ID', 400);
        }

        if (!userId) {
            throw new ContactGroupServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Verify group exists and belongs to user
        const group = await getContactGroupById(groupId, userId);
        if (!group) {
            throw new ContactGroupServiceError('Contact group not found', 'GROUP_NOT_FOUND', 404);
        }

        // Get all memberships for the group
        const memberships = await db
            .select()
            .from(contactGroupMemberships)
            .where(eq(contactGroupMemberships.groupId, groupId));

        return memberships;
    } catch (error) {
        if (error instanceof ContactGroupServiceError) {
            throw error;
        }
        throw new ContactGroupServiceError(
            'Failed to get group memberships',
            'GET_MEMBERSHIPS_FAILED',
            500
        );
    }
}
