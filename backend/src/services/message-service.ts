import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
    messages,
    conversations,
    conversationParticipants,
    users,
    SelectMessage,
    InsertMessage,
    SelectConversation,
    InsertConversation,
    SelectConversationParticipant,
    InsertConversationParticipant,
    SelectUser,
} from '../db/schema.js';

/**
 * Message Service
 * Handles message creation, conversation management, and participant operations
 * 
 * Note: Typing indicators are NOT handled by this service. They use Supabase Realtime
 * Presence feature on the frontend for real-time, ephemeral state sharing without
 * database writes. See TYPING_INDICATORS.md for implementation details.
 */

export interface CreateMessageData {
    conversationId: string;
    content: string;
    messageType?: 'text' | 'file' | 'system';
    metadata?: Record<string, any>;
}

export interface CreateConversationData {
    type: 'one_on_one' | 'group';
    participantIds: string[];
    name?: string;
}

export interface MessageWithSender extends SelectMessage {
    sender: SelectUser;
}

export interface ConversationWithParticipants extends SelectConversation {
    participants: SelectUser[];
}

export class MessageServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'MessageServiceError';
    }
}

/**
 * Create a new message in a conversation
 */
export async function createMessage(
    userId: string,
    data: CreateMessageData
): Promise<SelectMessage> {
    try {
        // Validate input
        if (!userId) {
            throw new MessageServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.conversationId) {
            throw new MessageServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        if (!data.content || typeof data.content !== 'string') {
            throw new MessageServiceError('Message content is required and must be a string', 'INVALID_CONTENT', 400);
        }

        if (data.content.trim().length === 0) {
            throw new MessageServiceError('Message content cannot be empty', 'EMPTY_CONTENT', 400);
        }

        // Validate message type
        const validMessageTypes = ['text', 'file', 'system'];
        const messageType = data.messageType || 'text';
        if (!validMessageTypes.includes(messageType)) {
            throw new MessageServiceError(
                `Invalid message type. Must be one of: ${validMessageTypes.join(', ')}`,
                'INVALID_MESSAGE_TYPE',
                400
            );
        }

        // Verify conversation exists
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, data.conversationId))
            .limit(1);

        if (!conversation) {
            throw new MessageServiceError('Conversation not found', 'CONVERSATION_NOT_FOUND', 404);
        }

        // Verify user is a participant in the conversation
        const [participant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, data.conversationId),
                    eq(conversationParticipants.userId, userId),
                    isNull(conversationParticipants.leftAt)
                )
            )
            .limit(1);

        if (!participant) {
            throw new MessageServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Create message
        const messageData: InsertMessage = {
            conversationId: data.conversationId,
            senderId: userId,
            content: data.content,
            messageType,
            metadata: data.metadata || null,
        };

        const [newMessage] = await db
            .insert(messages)
            .values(messageData)
            .returning();

        if (!newMessage) {
            throw new MessageServiceError('Failed to create message', 'CREATE_MESSAGE_FAILED', 500);
        }

        // Update conversation's updatedAt timestamp
        await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, data.conversationId));

        return newMessage;
    } catch (error) {
        if (error instanceof MessageServiceError) {
            throw error;
        }
        throw new MessageServiceError(
            'Failed to create message',
            'CREATE_MESSAGE_FAILED',
            500
        );
    }
}

/**
 * Create a new conversation with participants
 */
export async function createConversation(
    userId: string,
    data: CreateConversationData
): Promise<ConversationWithParticipants> {
    try {
        // Validate input
        if (!userId) {
            throw new MessageServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.type) {
            throw new MessageServiceError('Conversation type is required', 'MISSING_TYPE', 400);
        }

        const validTypes = ['one_on_one', 'group'];
        if (!validTypes.includes(data.type)) {
            throw new MessageServiceError(
                `Invalid conversation type. Must be one of: ${validTypes.join(', ')}`,
                'INVALID_TYPE',
                400
            );
        }

        if (!data.participantIds || !Array.isArray(data.participantIds)) {
            throw new MessageServiceError(
                'Participant IDs are required and must be an array',
                'INVALID_PARTICIPANT_IDS',
                400
            );
        }

        if (data.participantIds.length === 0) {
            throw new MessageServiceError(
                'At least one participant is required',
                'NO_PARTICIPANTS',
                400
            );
        }

        // Validate conversation type constraints
        if (data.type === 'one_on_one' && data.participantIds.length !== 1) {
            throw new MessageServiceError(
                'One-on-one conversations must have exactly one other participant',
                'INVALID_ONE_ON_ONE_PARTICIPANTS',
                400
            );
        }

        if (data.type === 'group' && data.participantIds.length < 1) {
            throw new MessageServiceError(
                'Group conversations must have at least one other participant',
                'INVALID_GROUP_PARTICIPANTS',
                400
            );
        }

        // Validate group name if provided
        if (data.name !== undefined) {
            if (typeof data.name !== 'string') {
                throw new MessageServiceError('Conversation name must be a string', 'INVALID_NAME', 400);
            }
            if (data.name.length > 100) {
                throw new MessageServiceError(
                    'Conversation name must not exceed 100 characters',
                    'NAME_TOO_LONG',
                    400
                );
            }
        }

        // Ensure creator is not in the participant list (will be added separately)
        const participantIds = data.participantIds.filter(id => id !== userId);

        // Verify all participants exist
        const allParticipantIds = [userId, ...participantIds];
        const participantUsers = await db
            .select()
            .from(users)
            .where(inArray(users.id, allParticipantIds));

        if (participantUsers.length !== allParticipantIds.length) {
            throw new MessageServiceError(
                'One or more participants not found',
                'PARTICIPANTS_NOT_FOUND',
                404
            );
        }

        // For one-on-one conversations, check if conversation already exists
        if (data.type === 'one_on_one' && participantIds.length === 1) {
            const otherUserId = participantIds[0];

            // Find existing one-on-one conversation between these two users
            const existingConversations = await db
                .select({
                    conversation: conversations,
                })
                .from(conversations)
                .where(eq(conversations.type, 'one_on_one'))
                .innerJoin(
                    conversationParticipants,
                    eq(conversationParticipants.conversationId, conversations.id)
                );

            // Check if there's a conversation with both users
            for (const conv of existingConversations) {
                const participants = await db
                    .select()
                    .from(conversationParticipants)
                    .where(
                        and(
                            eq(conversationParticipants.conversationId, conv.conversation.id),
                            isNull(conversationParticipants.leftAt)
                        )
                    );

                const participantUserIds = participants.map(p => p.userId);
                if (
                    participantUserIds.includes(userId) &&
                    participantUserIds.includes(otherUserId) &&
                    participantUserIds.length === 2
                ) {
                    // Return existing conversation
                    return {
                        ...conv.conversation,
                        participants: participantUsers,
                    };
                }
            }
        }

        // Create conversation
        const conversationData: InsertConversation = {
            type: data.type,
            name: data.name || null,
            createdBy: userId,
        };

        const [newConversation] = await db
            .insert(conversations)
            .values(conversationData)
            .returning();

        if (!newConversation) {
            throw new MessageServiceError('Failed to create conversation', 'CREATE_CONVERSATION_FAILED', 500);
        }

        // Add all participants (including creator)
        const participantData: InsertConversationParticipant[] = allParticipantIds.map(participantId => ({
            conversationId: newConversation.id,
            userId: participantId,
        }));

        await db
            .insert(conversationParticipants)
            .values(participantData);

        return {
            ...newConversation,
            participants: participantUsers,
        };
    } catch (error) {
        if (error instanceof MessageServiceError) {
            throw error;
        }
        throw new MessageServiceError(
            'Failed to create conversation',
            'CREATE_CONVERSATION_FAILED',
            500
        );
    }
}

/**
 * Add a participant to an existing conversation
 */
export async function addParticipant(
    userId: string,
    conversationId: string,
    participantUserId: string
): Promise<SelectConversationParticipant> {
    try {
        // Validate input
        if (!userId) {
            throw new MessageServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!conversationId) {
            throw new MessageServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        if (!participantUserId) {
            throw new MessageServiceError('Participant user ID is required', 'MISSING_PARTICIPANT_USER_ID', 400);
        }

        // Verify conversation exists
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);

        if (!conversation) {
            throw new MessageServiceError('Conversation not found', 'CONVERSATION_NOT_FOUND', 404);
        }

        // Only allow adding participants to group conversations
        if (conversation.type !== 'group') {
            throw new MessageServiceError(
                'Can only add participants to group conversations',
                'INVALID_CONVERSATION_TYPE',
                400
            );
        }

        // Verify requesting user is a participant
        const [requestingParticipant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    eq(conversationParticipants.userId, userId),
                    isNull(conversationParticipants.leftAt)
                )
            )
            .limit(1);

        if (!requestingParticipant) {
            throw new MessageServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Verify new participant exists
        const [newParticipantUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, participantUserId))
            .limit(1);

        if (!newParticipantUser) {
            throw new MessageServiceError('User to add not found', 'USER_NOT_FOUND', 404);
        }

        // Check if user is already a participant
        const [existingParticipant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    eq(conversationParticipants.userId, participantUserId),
                    isNull(conversationParticipants.leftAt)
                )
            )
            .limit(1);

        if (existingParticipant) {
            throw new MessageServiceError(
                'User is already a participant in this conversation',
                'ALREADY_PARTICIPANT',
                409
            );
        }

        // Add participant
        const participantData: InsertConversationParticipant = {
            conversationId,
            userId: participantUserId,
        };

        const [newParticipant] = await db
            .insert(conversationParticipants)
            .values(participantData)
            .returning();

        if (!newParticipant) {
            throw new MessageServiceError('Failed to add participant', 'ADD_PARTICIPANT_FAILED', 500);
        }

        // Update conversation's updatedAt timestamp
        await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));

        return newParticipant;
    } catch (error) {
        if (error instanceof MessageServiceError) {
            throw error;
        }
        throw new MessageServiceError(
            'Failed to add participant',
            'ADD_PARTICIPANT_FAILED',
            500
        );
    }
}

/**
 * Remove a participant from a conversation (user leaves)
 */
export async function removeParticipant(
    userId: string,
    conversationId: string
): Promise<void> {
    try {
        // Validate input
        if (!userId) {
            throw new MessageServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!conversationId) {
            throw new MessageServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        // Verify conversation exists
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);

        if (!conversation) {
            throw new MessageServiceError('Conversation not found', 'CONVERSATION_NOT_FOUND', 404);
        }

        // Find participant record
        const [participant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    eq(conversationParticipants.userId, userId),
                    isNull(conversationParticipants.leftAt)
                )
            )
            .limit(1);

        if (!participant) {
            throw new MessageServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                404
            );
        }

        // Mark participant as left (soft delete)
        await db
            .update(conversationParticipants)
            .set({ leftAt: new Date() })
            .where(eq(conversationParticipants.id, participant.id));

        // Update conversation's updatedAt timestamp
        await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));

    } catch (error) {
        if (error instanceof MessageServiceError) {
            throw error;
        }
        throw new MessageServiceError(
            'Failed to remove participant',
            'REMOVE_PARTICIPANT_FAILED',
            500
        );
    }
}

/**
 * Get messages for a conversation with pagination
 */
export async function getConversationMessages(
    userId: string,
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
): Promise<MessageWithSender[]> {
    try {
        // Validate input
        if (!userId) {
            throw new MessageServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!conversationId) {
            throw new MessageServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        if (limit < 1 || limit > 100) {
            throw new MessageServiceError('Limit must be between 1 and 100', 'INVALID_LIMIT', 400);
        }

        // Verify user is a participant
        const [participant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    eq(conversationParticipants.userId, userId)
                )
            )
            .limit(1);

        if (!participant) {
            throw new MessageServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Build query conditions
        const conditions = [eq(messages.conversationId, conversationId)];

        // If beforeMessageId is provided, get messages before that message
        if (beforeMessageId) {
            const [beforeMessage] = await db
                .select()
                .from(messages)
                .where(eq(messages.id, beforeMessageId))
                .limit(1);

            if (beforeMessage) {
                conditions.push(
                    // Get messages created before the reference message
                    // Using createdAt for pagination
                    desc(messages.createdAt)
                );
            }
        }

        // Get messages with sender information
        const conversationMessages = await db
            .select({
                id: messages.id,
                conversationId: messages.conversationId,
                senderId: messages.senderId,
                content: messages.content,
                messageType: messages.messageType,
                metadata: messages.metadata,
                createdAt: messages.createdAt,
                deliveredAt: messages.deliveredAt,
                readAt: messages.readAt,
                sender: users,
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(and(...conditions))
            .orderBy(desc(messages.createdAt))
            .limit(limit);

        return conversationMessages as MessageWithSender[];
    } catch (error) {
        if (error instanceof MessageServiceError) {
            throw error;
        }
        throw new MessageServiceError(
            'Failed to get conversation messages',
            'GET_MESSAGES_FAILED',
            500
        );
    }
}

/**
 * Get a conversation by ID with participants
 */
export async function getConversationById(
    userId: string,
    conversationId: string
): Promise<ConversationWithParticipants | null> {
    try {
        // Validate input
        if (!userId) {
            throw new MessageServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!conversationId) {
            throw new MessageServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        // Verify user is a participant
        const [participant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    eq(conversationParticipants.userId, userId)
                )
            )
            .limit(1);

        if (!participant) {
            throw new MessageServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Get conversation
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);

        if (!conversation) {
            return null;
        }

        // Get all active participants
        const participants = await db
            .select({
                user: users,
            })
            .from(conversationParticipants)
            .innerJoin(users, eq(conversationParticipants.userId, users.id))
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        return {
            ...conversation,
            participants: participants.map(p => p.user),
        };
    } catch (error) {
        if (error instanceof MessageServiceError) {
            throw error;
        }
        throw new MessageServiceError(
            'Failed to get conversation',
            'GET_CONVERSATION_FAILED',
            500
        );
    }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string): Promise<ConversationWithParticipants[]> {
    try {
        // Validate input
        if (!userId) {
            throw new MessageServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        // Get all conversations where user is an active participant
        const userConversationIds = await db
            .select({
                conversationId: conversationParticipants.conversationId,
            })
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.userId, userId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        if (userConversationIds.length === 0) {
            return [];
        }

        const conversationIds = userConversationIds.map(c => c.conversationId);

        // Get conversations
        const userConversations = await db
            .select()
            .from(conversations)
            .where(inArray(conversations.id, conversationIds))
            .orderBy(desc(conversations.updatedAt));

        // Get participants for each conversation
        const conversationsWithParticipants: ConversationWithParticipants[] = [];

        for (const conversation of userConversations) {
            const participants = await db
                .select({
                    user: users,
                })
                .from(conversationParticipants)
                .innerJoin(users, eq(conversationParticipants.userId, users.id))
                .where(
                    and(
                        eq(conversationParticipants.conversationId, conversation.id),
                        isNull(conversationParticipants.leftAt)
                    )
                );

            conversationsWithParticipants.push({
                ...conversation,
                participants: participants.map(p => p.user),
            });
        }

        return conversationsWithParticipants;
    } catch (error) {
        if (error instanceof MessageServiceError) {
            throw error;
        }
        throw new MessageServiceError(
            'Failed to get user conversations',
            'GET_USER_CONVERSATIONS_FAILED',
            500
        );
    }
}
