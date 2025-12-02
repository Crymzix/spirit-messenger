import { eq, and, or, isNull, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
    calls,
    callParticipants,
    conversations,
    conversationParticipants,
    users,
    messages,
    SelectCall,
    InsertCall,
    SelectCallParticipant,
    InsertCallParticipant,
    InsertMessage,
} from '../db/schema.js';
import { realtimePublisher } from '../lib/realtime-publisher.js';
import { queueCallTimeout } from '../config/queue.js';

/**
 * Call Service
 * Handles WebRTC call state management, signaling coordination, and call history
 */

export interface InitiateCallData {
    conversationId: string;
    callType: 'voice' | 'video';
}

export interface SignalData {
    type: 'signal';
    data: any;
    targetUserId: string;
}

export interface CallWithParticipants extends SelectCall {
    participants: SelectCallParticipant[];
}

export class CallServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400,
        public cause?: unknown
    ) {
        super(message);
        this.name = 'CallServiceError';
        if (cause instanceof Error) {
            this.stack = cause.stack;
        }
    }
}

/**
 * Mark a call as failed
 * Updates call status to failed, records error reason, and publishes call_failed event
 * This is an internal helper function used when errors occur during call operations
 */
async function markCallAsFailed(
    callId: string,
    conversationId: string,
    errorReason: string
): Promise<void> {
    try {
        // Update call status to failed
        const now = new Date();
        await db
            .update(calls)
            .set({
                status: 'failed',
                errorReason: errorReason,
                endedAt: now,
                updatedAt: now,
            })
            .where(eq(calls.id, callId));

        // Get participants for notification
        const participants = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        // Publish call_failed event via Supabase Realtime
        const participantUserIds = participants.map(p => p.userId);
        await realtimePublisher.publishCallFailed(participantUserIds, {
            callId: callId,
            conversationId: conversationId,
            errorReason: errorReason,
        });
    } catch (error) {
        // Log but don't throw - we're already in an error state
        console.error('Error marking call as failed:', error);
    }
}

/**
 * Initiate a new call
 * Verifies users are online, checks for existing calls, creates call record
 */
export async function initiateCall(
    userId: string,
    data: InitiateCallData
): Promise<SelectCall> {
    try {
        // Validate input
        if (!userId) {
            throw new CallServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.conversationId) {
            throw new CallServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        if (!data.callType || !['voice', 'video'].includes(data.callType)) {
            throw new CallServiceError('Call type must be "voice" or "video"', 'INVALID_CALL_TYPE', 400);
        }

        // Verify conversation exists
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, data.conversationId))
            .limit(1);

        if (!conversation) {
            throw new CallServiceError('Conversation not found', 'CONVERSATION_NOT_FOUND', 404);
        }

        // Only support one-on-one calls for now
        if (conversation.type !== 'one_on_one') {
            throw new CallServiceError(
                'Calls are only supported for one-on-one conversations',
                'INVALID_CONVERSATION_TYPE',
                400
            );
        }

        // Get all active participants in the conversation
        const participants = await db
            .select({
                userId: conversationParticipants.userId,
            })
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, data.conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        if (participants.length !== 2) {
            throw new CallServiceError(
                'Conversation must have exactly 2 participants for calls',
                'INVALID_PARTICIPANT_COUNT',
                400
            );
        }

        // Verify initiator is a participant
        const isParticipant = participants.some(p => p.userId === userId);
        if (!isParticipant) {
            throw new CallServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Get the other participant
        const otherParticipant = participants.find(p => p.userId !== userId);
        if (!otherParticipant) {
            throw new CallServiceError('Could not find other participant', 'PARTICIPANT_NOT_FOUND', 500);
        }

        // Verify both users are online
        const participantUsers = await db
            .select()
            .from(users)
            .where(inArray(users.id, [userId, otherParticipant.userId]));

        for (const user of participantUsers) {
            if (user.presenceStatus === 'offline' || user.presenceStatus === 'appear_offline') {
                throw new CallServiceError(
                    `User ${user.displayName || user.username} is not online`,
                    'USER_NOT_ONLINE',
                    400
                );
            }
        }

        // Check if either user has an existing active or ringing call
        const existingCalls = await db
            .select()
            .from(calls)
            .innerJoin(
                conversationParticipants,
                eq(conversationParticipants.conversationId, calls.conversationId)
            )
            .where(
                and(
                    or(
                        eq(conversationParticipants.userId, userId),
                        eq(conversationParticipants.userId, otherParticipant.userId)
                    ),
                    or(
                        eq(calls.status, 'ringing'),
                        eq(calls.status, 'active')
                    )
                )
            );

        if (existingCalls.length > 0) {
            throw new CallServiceError(
                'User is currently on another call',
                'USER_BUSY',
                409
            );
        }

        // Create call record
        const callData: InsertCall = {
            conversationId: data.conversationId,
            initiatorId: userId,
            callType: data.callType,
            status: 'ringing',
        };

        const [newCall] = await db
            .insert(calls)
            .values(callData)
            .returning();

        if (!newCall) {
            throw new CallServiceError('Failed to create call', 'CREATE_CALL_FAILED', 500);
        }

        // Get the initiator's display name
        const initiator = participantUsers.find(u => u.id === userId);
        const initiatorName = initiator?.displayName || initiator?.username || 'Unknown';

        // Create system message for incoming call with ringing status
        const messageData: InsertMessage = {
            conversationId: data.conversationId,
            senderId: userId,
            content: `${initiatorName} started a ${data.callType} call`,
            messageType: 'system',
            metadata: {
                callId: newCall.id,
                callType: data.callType,
                status: 'ringing',
            },
        };

        let messageId: string | undefined;
        try {
            const [newMessage] = await db
                .insert(messages)
                .values(messageData)
                .returning();
            messageId = newMessage?.id;

            // Update call record with message ID for later updates
            if (messageId) {
                await db
                    .update(calls)
                    .set({ messageId: messageId })
                    .where(eq(calls.id, newCall.id));
            }
        } catch (messageError) {
            console.error('Error creating call initiation system message:', messageError);
            // Don't fail the call if the message creation fails
        }

        // Queue call timeout (30 seconds) - will automatically mark as missed if not answered
        try {
            await queueCallTimeout({
                callId: newCall.id,
                conversationId: data.conversationId,
                initiatorId: userId,
                callType: data.callType,
            });
        } catch (queueError) {
            console.error('Error queueing call timeout:', queueError);
            // Don't fail the call if queueing fails - timeout just won't auto-expire
        }

        // Publish call_ringing event via Supabase Realtime
        try {
            await realtimePublisher.publishCallRinging(otherParticipant.userId, {
                callId: newCall.id,
                conversationId: data.conversationId,
                initiatorId: userId,
                callType: data.callType,
            });
        } catch (publishError) {
            // If publishing fails, mark call as failed
            console.error('Error publishing call_ringing event:', publishError);
            await markCallAsFailed(
                newCall.id,
                data.conversationId,
                'Failed to notify recipient'
            );
            throw new CallServiceError(
                'Failed to notify recipient of incoming call',
                'PUBLISH_FAILED',
                500
            );
        }

        return newCall;
    } catch (error) {
        if (error instanceof CallServiceError) {
            throw error;
        }
        console.error('Error initiating call:', error);
        throw new CallServiceError(
            'Failed to initiate call',
            'INITIATE_CALL_FAILED',
            500,
            error
        );
    }
}

/**
 * Answer a call
 * Updates call status to active, records started_at timestamp, creates call_participants records
 */
export async function answerCall(
    userId: string,
    callId: string
): Promise<SelectCall> {
    try {
        // Validate input
        if (!userId) {
            throw new CallServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!callId) {
            throw new CallServiceError('Call ID is required', 'MISSING_CALL_ID', 400);
        }

        // Get call
        const [call] = await db
            .select()
            .from(calls)
            .where(eq(calls.id, callId))
            .limit(1);

        if (!call) {
            throw new CallServiceError('Call not found', 'CALL_NOT_FOUND', 404);
        }

        // Verify call is in ringing state
        if (call.status !== 'ringing') {
            throw new CallServiceError(
                `Cannot answer call with status: ${call.status}`,
                'INVALID_CALL_STATUS',
                400
            );
        }

        // Verify user is a participant in the conversation
        const participants = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, call.conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        const isParticipant = participants.some(p => p.userId === userId);
        if (!isParticipant) {
            throw new CallServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // User cannot answer their own call
        if (call.initiatorId === userId) {
            throw new CallServiceError(
                'Cannot answer your own call',
                'CANNOT_ANSWER_OWN_CALL',
                400
            );
        }

        // Update call status to active
        const now = new Date();
        const [updatedCall] = await db
            .update(calls)
            .set({
                status: 'active',
                startedAt: now,
                updatedAt: now,
            })
            .where(eq(calls.id, callId))
            .returning();

        if (!updatedCall) {
            throw new CallServiceError('Failed to update call status', 'UPDATE_CALL_FAILED', 500);
        }

        // Create call_participants records for both users
        const participantData: InsertCallParticipant[] = participants.map(p => ({
            callId: callId,
            userId: p.userId,
            joinedAt: now,
        }));

        try {
            await db
                .insert(callParticipants)
                .values(participantData);
        } catch (dbError) {
            // If creating participants fails, mark call as failed
            console.error('Error creating call participants:', dbError);
            await markCallAsFailed(
                callId,
                call.conversationId,
                'Failed to create call participants'
            );
            throw new CallServiceError(
                'Failed to create call participants',
                'CREATE_PARTICIPANTS_FAILED',
                500
            );
        }

        // Update message status from ringing to active (if message exists)
        if (call.messageId) {
            try {
                await db
                    .update(messages)
                    .set({
                        metadata: {
                            callId: callId,
                            callType: call.callType,
                            status: 'active',
                        },
                    })
                    .where(eq(messages.id, call.messageId));
            } catch (messageError) {
                console.error('Error updating message status:', messageError);
                // Continue - this is not critical
            }
        }

        // Publish call_answered event via Supabase Realtime to both participants
        const participantUserIds = participants.map(p => p.userId);
        try {
            await realtimePublisher.publishCallAnswered(participantUserIds, {
                callId: updatedCall.id,
                conversationId: updatedCall.conversationId,
                answeredBy: userId,
            });
        } catch (publishError) {
            // If publishing fails, mark call as failed
            console.error('Error publishing call_answered event:', publishError);
            await markCallAsFailed(
                callId,
                call.conversationId,
                'Failed to notify participants of call answer'
            );
            throw new CallServiceError(
                'Failed to notify participants of call answer',
                'PUBLISH_FAILED',
                500
            );
        }

        return updatedCall;
    } catch (error) {
        if (error instanceof CallServiceError) {
            throw error;
        }
        console.error('Error answering call:', error);

        // Try to mark call as failed if we have the call info
        try {
            const [failedCall] = await db
                .select()
                .from(calls)
                .where(eq(calls.id, callId))
                .limit(1);

            if (failedCall) {
                await markCallAsFailed(
                    callId,
                    failedCall.conversationId,
                    'Unexpected error while answering call'
                );
            }
        } catch (markError) {
            console.error('Error marking call as failed:', markError);
        }

        throw new CallServiceError(
            'Failed to answer call',
            'ANSWER_CALL_FAILED',
            500,
            error
        );
    }
}

/**
 * Decline a call
 * Updates call status to declined and creates system message
 */
export async function declineCall(
    userId: string,
    callId: string
): Promise<SelectCall> {
    try {
        // Validate input
        if (!userId) {
            throw new CallServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!callId) {
            throw new CallServiceError('Call ID is required', 'MISSING_CALL_ID', 400);
        }

        // Get call
        const [call] = await db
            .select()
            .from(calls)
            .where(eq(calls.id, callId))
            .limit(1);

        if (!call) {
            throw new CallServiceError('Call not found', 'CALL_NOT_FOUND', 404);
        }

        // Verify call is in ringing state
        if (call.status !== 'ringing') {
            throw new CallServiceError(
                `Cannot decline call with status: ${call.status}`,
                'INVALID_CALL_STATUS',
                400
            );
        }

        // Verify user is a participant in the conversation
        const participants = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, call.conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        const isParticipant = participants.some(p => p.userId === userId);
        if (!isParticipant) {
            throw new CallServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Update call status to declined
        const now = new Date();
        const [updatedCall] = await db
            .update(calls)
            .set({
                status: 'declined',
                endedAt: now,
                updatedAt: now,
            })
            .where(eq(calls.id, callId))
            .returning();

        if (!updatedCall) {
            throw new CallServiceError('Failed to update call status', 'UPDATE_CALL_FAILED', 500);
        }

        // Update message status from ringing to declined (if message exists)
        if (call.messageId) {
            try {
                await db
                    .update(messages)
                    .set({
                        metadata: {
                            callId: callId,
                            callType: call.callType,
                            status: 'declined',
                        },
                    })
                    .where(eq(messages.id, call.messageId));
            } catch (messageError) {
                console.error('Error updating message status:', messageError);
                // Continue - this is not critical
            }
        }

        // Publish call_declined event via Supabase Realtime
        const participantUserIds = participants.map(p => p.userId);
        try {
            await realtimePublisher.publishCallDeclined(participantUserIds, {
                callId: updatedCall.id,
                conversationId: updatedCall.conversationId,
                declinedBy: userId,
            });
        } catch (publishError) {
            console.error('Error publishing call_declined event:', publishError);
            // Don't mark as failed since call is already declined
        }

        return updatedCall;
    } catch (error) {
        if (error instanceof CallServiceError) {
            throw error;
        }
        console.error('Error declining call:', error);

        // Try to mark call as failed if we have the call info
        try {
            const [failedCall] = await db
                .select()
                .from(calls)
                .where(eq(calls.id, callId))
                .limit(1);

            if (failedCall && failedCall.status === 'ringing') {
                await markCallAsFailed(
                    callId,
                    failedCall.conversationId,
                    'Unexpected error while declining call'
                );
            }
        } catch (markError) {
            console.error('Error marking call as failed:', markError);
        }

        throw new CallServiceError(
            'Failed to decline call',
            'DECLINE_CALL_FAILED',
            500,
            error
        );
    }
}

/**
 * Mark a call as missed
 * Updates call status to missed and creates system message
 */
export async function missedCall(
    callId: string
): Promise<SelectCall> {
    try {
        // Validate input
        if (!callId) {
            throw new CallServiceError('Call ID is required', 'MISSING_CALL_ID', 400);
        }

        // Get call
        const [call] = await db
            .select()
            .from(calls)
            .where(eq(calls.id, callId))
            .limit(1);

        if (!call) {
            throw new CallServiceError('Call not found', 'CALL_NOT_FOUND', 404);
        }

        // Verify call is in ringing state
        if (call.status !== 'ringing') {
            throw new CallServiceError(
                `Cannot mark call as missed with status: ${call.status}`,
                'INVALID_CALL_STATUS',
                400
            );
        }

        // Update call status to missed
        const now = new Date();
        const [updatedCall] = await db
            .update(calls)
            .set({
                status: 'missed',
                endedAt: now,
                updatedAt: now,
            })
            .where(eq(calls.id, callId))
            .returning();

        if (!updatedCall) {
            throw new CallServiceError('Failed to update call status', 'UPDATE_CALL_FAILED', 500);
        }

        // Update message status from ringing to missed (if message exists)
        if (call.messageId) {
            try {
                await db
                    .update(messages)
                    .set({
                        metadata: {
                            callId: callId,
                            callType: call.callType,
                            status: 'missed',
                        },
                    })
                    .where(eq(messages.id, call.messageId));
            } catch (messageError) {
                console.error('Error updating message status:', messageError);
                // Continue - this is not critical
            }
        }

        // Get participants for notification
        const participants = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, call.conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        // Publish call_missed event via Supabase Realtime
        const participantUserIds = participants.map(p => p.userId);
        try {
            await realtimePublisher.publishCallMissed(participantUserIds, {
                callId: updatedCall.id,
                conversationId: updatedCall.conversationId,
            });
        } catch (publishError) {
            console.error('Error publishing call_missed event:', publishError);
            // Don't mark as failed since call is already missed
        }

        return updatedCall;
    } catch (error) {
        if (error instanceof CallServiceError) {
            throw error;
        }
        console.error('Error marking call as missed:', error);

        // Try to mark call as failed if we have the call info
        try {
            const [failedCall] = await db
                .select()
                .from(calls)
                .where(eq(calls.id, callId))
                .limit(1);

            if (failedCall && failedCall.status === 'ringing') {
                await markCallAsFailed(
                    callId,
                    failedCall.conversationId,
                    'Unexpected error while marking call as missed'
                );
            }
        } catch (markError) {
            console.error('Error marking call as failed:', markError);
        }

        throw new CallServiceError(
            'Failed to mark call as missed',
            'MISSED_CALL_FAILED',
            500,
            error
        );
    }
}

/**
 * End a call
 * Updates call status to ended, records ended_at, updates call_participants with left_at, calculates duration
 */
export async function endCall(
    userId: string,
    callId: string
): Promise<SelectCall> {
    try {
        // Validate input
        if (!userId) {
            throw new CallServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!callId) {
            throw new CallServiceError('Call ID is required', 'MISSING_CALL_ID', 400);
        }

        // Get call
        const [call] = await db
            .select()
            .from(calls)
            .where(eq(calls.id, callId))
            .limit(1);

        if (!call) {
            throw new CallServiceError('Call not found', 'CALL_NOT_FOUND', 404);
        }

        // Verify call is in active state
        if (call.status !== 'active') {
            throw new CallServiceError(
                `Cannot end call with status: ${call.status}`,
                'INVALID_CALL_STATUS',
                400
            );
        }

        // Verify user is a participant in the conversation
        const participants = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, call.conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        const isParticipant = participants.some(p => p.userId === userId);
        if (!isParticipant) {
            throw new CallServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Update call status to ended
        const now = new Date();
        const [updatedCall] = await db
            .update(calls)
            .set({
                status: 'ended',
                endedAt: now,
                updatedAt: now,
            })
            .where(eq(calls.id, callId))
            .returning();

        if (!updatedCall) {
            throw new CallServiceError('Failed to update call status', 'UPDATE_CALL_FAILED', 500);
        }

        // Update call_participants with left_at timestamp
        try {
            await db
                .update(callParticipants)
                .set({ leftAt: now })
                .where(
                    and(
                        eq(callParticipants.callId, callId),
                        isNull(callParticipants.leftAt)
                    )
                );
        } catch (dbError) {
            console.error('Error updating call participants:', dbError);
            // Continue - this is not critical
        }

        // Calculate duration
        let durationSeconds = 0;
        if (call.startedAt && updatedCall.endedAt) {
            durationSeconds = Math.floor(
                (updatedCall.endedAt.getTime() - call.startedAt.getTime()) / 1000
            );
        }

        // Update message status from active to completed with duration (if message exists)
        if (call.messageId) {
            try {
                await db
                    .update(messages)
                    .set({
                        metadata: {
                            callId: callId,
                            callType: call.callType,
                            durationSeconds: durationSeconds,
                            status: 'completed',
                        },
                    })
                    .where(eq(messages.id, call.messageId));
            } catch (messageError) {
                console.error('Error updating message status:', messageError);
                // Continue - this is not critical
            }
        }

        // Publish call_ended event via Supabase Realtime
        const participantUserIds = participants.map(p => p.userId);
        try {
            await realtimePublisher.publishCallEnded(participantUserIds, {
                callId: updatedCall.id,
                conversationId: updatedCall.conversationId,
                endedBy: userId,
                durationSeconds: durationSeconds,
            });
        } catch (publishError) {
            console.error('Error publishing call_ended event:', publishError);
            // Don't mark as failed since call is already ended
        }

        return updatedCall;
    } catch (error) {
        if (error instanceof CallServiceError) {
            throw error;
        }
        console.error('Error ending call:', error);

        // Try to mark call as failed if we have the call info
        try {
            const [failedCall] = await db
                .select()
                .from(calls)
                .where(eq(calls.id, callId))
                .limit(1);

            if (failedCall && failedCall.status === 'active') {
                await markCallAsFailed(
                    callId,
                    failedCall.conversationId,
                    'Unexpected error while ending call'
                );
            }
        } catch (markError) {
            console.error('Error marking call as failed:', markError);
        }

        throw new CallServiceError(
            'Failed to end call',
            'END_CALL_FAILED',
            500,
            error
        );
    }
}

/**
 * Get active call for a conversation
 * Queries for active or ringing calls in a conversation
 */
export async function getActiveCall(
    userId: string,
    conversationId: string
): Promise<CallWithParticipants | null> {
    try {
        // Validate input
        if (!userId) {
            throw new CallServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!conversationId) {
            throw new CallServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        // Verify user is a participant in the conversation
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
            throw new CallServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Get active or ringing call
        const [activeCall] = await db
            .select()
            .from(calls)
            .where(
                and(
                    eq(calls.conversationId, conversationId),
                    or(
                        eq(calls.status, 'active'),
                        eq(calls.status, 'ringing')
                    )
                )
            )
            .limit(1);

        if (!activeCall) {
            return null;
        }

        // Get call participants
        const participants = await db
            .select()
            .from(callParticipants)
            .where(eq(callParticipants.callId, activeCall.id));

        return {
            ...activeCall,
            participants,
        };
    } catch (error) {
        if (error instanceof CallServiceError) {
            throw error;
        }
        console.error('Error getting active call:', error);
        throw new CallServiceError(
            'Failed to get active call',
            'GET_ACTIVE_CALL_FAILED',
            500,
            error
        );
    }
}

/**
 * Handle signaling data
 * Validates participants and forwards signaling data via Supabase Realtime
 */
export async function handleSignal(
    userId: string,
    callId: string,
    signalData: SignalData
): Promise<void> {
    try {
        // Validate input
        if (!userId) {
            throw new CallServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!callId) {
            throw new CallServiceError('Call ID is required', 'MISSING_CALL_ID', 400);
        }

        if (!signalData || !signalData.type || !signalData.targetUserId) {
            throw new CallServiceError('Invalid signal data', 'INVALID_SIGNAL_DATA', 400);
        }

        const validSignalTypes = ['offer', 'answer', 'ice-candidate', 'signal'];
        if (!validSignalTypes.includes(signalData.type)) {
            throw new CallServiceError(
                `Invalid signal type. Must be one of: ${validSignalTypes.join(', ')}`,
                'INVALID_SIGNAL_TYPE',
                400
            );
        }

        // Get call
        const [call] = await db
            .select()
            .from(calls)
            .where(eq(calls.id, callId))
            .limit(1);

        if (!call) {
            throw new CallServiceError('Call not found', 'CALL_NOT_FOUND', 404);
        }

        // Verify call is in active or ringing state
        if (call.status !== 'active' && call.status !== 'ringing') {
            throw new CallServiceError(
                `Cannot send signal for call with status: ${call.status}`,
                'INVALID_CALL_STATUS',
                400
            );
        }

        // Verify both users are participants in the conversation
        const participants = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, call.conversationId),
                    isNull(conversationParticipants.leftAt)
                )
            );

        const senderIsParticipant = participants.some(p => p.userId === userId);
        const targetIsParticipant = participants.some(p => p.userId === signalData.targetUserId);

        if (!senderIsParticipant) {
            throw new CallServiceError(
                'You are not a participant in this call',
                'NOT_PARTICIPANT',
                403
            );
        }

        if (!targetIsParticipant) {
            throw new CallServiceError(
                'Target user is not a participant in this call',
                'TARGET_NOT_PARTICIPANT',
                400
            );
        }

        // Forward signal via Supabase Realtime
        try {
            await realtimePublisher.publishSignal({
                callId: callId,
                conversationId: call.conversationId,
                fromUserId: userId,
                targetUserId: signalData.targetUserId,
                data: signalData.data,
            });
        } catch (publishError) {
            // If signaling fails, mark call as failed
            console.error('Error publishing signal:', publishError);
            await markCallAsFailed(
                callId,
                call.conversationId,
                'Failed to forward signaling data'
            );
            throw new CallServiceError(
                'Failed to forward signaling data',
                'SIGNAL_PUBLISH_FAILED',
                500
            );
        }

    } catch (error) {
        if (error instanceof CallServiceError) {
            throw error;
        }
        console.error('Error handling signal:', error);

        // Try to mark call as failed if we have the call info
        try {
            const [failedCall] = await db
                .select()
                .from(calls)
                .where(eq(calls.id, callId))
                .limit(1);

            if (failedCall && (failedCall.status === 'active' || failedCall.status === 'ringing')) {
                await markCallAsFailed(
                    callId,
                    failedCall.conversationId,
                    'Unexpected error while handling signal'
                );
            }
        } catch (markError) {
            console.error('Error marking call as failed:', markError);
        }

        throw new CallServiceError(
            'Failed to handle signal',
            'HANDLE_SIGNAL_FAILED',
            500,
            error
        );
    }
}
