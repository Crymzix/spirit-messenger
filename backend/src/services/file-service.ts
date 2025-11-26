import { eq, and, isNull, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
    files,
    messages,
    conversationParticipants,
    fileTransferRequests,
    SelectFile,
    InsertFile,
    SelectFileTransferRequest,
    InsertFileTransferRequest,
} from '../db/schema.js';

/**
 * File Service
 * Handles file upload, download, and validation operations
 */

export interface CreateFileData {
    messageId: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
    uploadStatus?: 'pending' | 'completed' | 'failed';
    transferRequestId?: string;
}

export interface CreateFileTransferRequestData {
    conversationId: string;
    senderId: string;
    receiverId: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    messageId?: string;
}

export interface UpdateFileStatusData {
    uploadStatus: 'pending' | 'completed' | 'failed';
}

export class FileServiceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'FileServiceError';
    }
}

// File validation constants
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB in bytes
export const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/webm;codecs=opus',
    // Video
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
];

/**
 * Validate file size and type
 */
export function validateFile(filename: string, fileSize: number, mimeType: string): void {
    // Validate filename
    if (!filename || typeof filename !== 'string') {
        throw new FileServiceError('Filename is required and must be a string', 'INVALID_FILENAME', 400);
    }

    if (filename.trim().length === 0) {
        throw new FileServiceError('Filename cannot be empty', 'EMPTY_FILENAME', 400);
    }

    if (filename.length > 255) {
        throw new FileServiceError('Filename must not exceed 255 characters', 'FILENAME_TOO_LONG', 400);
    }

    // Validate file size
    if (typeof fileSize !== 'number' || fileSize <= 0) {
        throw new FileServiceError('File size must be a positive number', 'INVALID_FILE_SIZE', 400);
    }

    if (fileSize > MAX_FILE_SIZE) {
        throw new FileServiceError(
            `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
            'FILE_TOO_LARGE',
            400
        );
    }

    // Validate MIME type
    if (!mimeType || typeof mimeType !== 'string') {
        throw new FileServiceError('MIME type is required and must be a string', 'INVALID_MIME_TYPE', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        throw new FileServiceError(
            'File type not allowed. Please upload a supported file type.',
            'UNSUPPORTED_FILE_TYPE',
            400
        );
    }
}

/**
 * Create a file record in the database
 */
export async function createFile(
    userId: string,
    data: CreateFileData
): Promise<SelectFile> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!data.messageId) {
            throw new FileServiceError('Message ID is required', 'MISSING_MESSAGE_ID', 400);
        }

        if (!data.storagePath || typeof data.storagePath !== 'string') {
            throw new FileServiceError('Storage path is required and must be a string', 'INVALID_STORAGE_PATH', 400);
        }

        // Validate file properties
        validateFile(data.filename, data.fileSize, data.mimeType);

        // Verify message exists and user has access to it
        const [message] = await db
            .select()
            .from(messages)
            .where(eq(messages.id, data.messageId))
            .limit(1);

        if (!message) {
            throw new FileServiceError('Message not found', 'MESSAGE_NOT_FOUND', 404);
        }

        // Verify user is a participant in the conversation
        const [participant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, message.conversationId),
                    eq(conversationParticipants.userId, userId),
                    isNull(conversationParticipants.leftAt)
                )
            )
            .limit(1);

        if (!participant) {
            throw new FileServiceError(
                'You are not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Verify user is the sender of the message
        if (message.senderId !== userId) {
            throw new FileServiceError(
                'You can only attach files to your own messages',
                'NOT_MESSAGE_SENDER',
                403
            );
        }

        // Create file record
        const fileData: InsertFile = {
            messageId: data.messageId,
            filename: data.filename,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            storagePath: data.storagePath,
            uploadStatus: data.uploadStatus || 'pending',
            transferRequestId: data.transferRequestId,
        };

        const [newFile] = await db
            .insert(files)
            .values(fileData)
            .returning();

        if (!newFile) {
            throw new FileServiceError('Failed to create file record', 'CREATE_FILE_FAILED', 500);
        }

        return newFile;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to create file record',
            'CREATE_FILE_FAILED',
            500
        );
    }
}

/**
 * Get file by ID with access verification
 */
export async function getFileById(
    userId: string,
    fileId: string
): Promise<SelectFile | null> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!fileId) {
            throw new FileServiceError('File ID is required', 'MISSING_FILE_ID', 400);
        }

        // Get file with message information
        const [file] = await db
            .select()
            .from(files)
            .where(eq(files.id, fileId))
            .limit(1);

        if (!file) {
            return null;
        }

        // Verify user has access to the file's message
        if (file.messageId) {
            const [message] = await db
                .select()
                .from(messages)
                .where(eq(messages.id, file.messageId))
                .limit(1);

            if (!message) {
                throw new FileServiceError('Associated message not found', 'MESSAGE_NOT_FOUND', 404);
            }

            // Verify user is a participant in the conversation
            const [participant] = await db
                .select()
                .from(conversationParticipants)
                .where(
                    and(
                        eq(conversationParticipants.conversationId, message.conversationId),
                        eq(conversationParticipants.userId, userId)
                    )
                )
                .limit(1);

            if (!participant) {
                throw new FileServiceError(
                    'You do not have access to this file',
                    'ACCESS_DENIED',
                    403
                );
            }
        }

        return file;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to get file',
            'GET_FILE_FAILED',
            500
        );
    }
}

/**
 * Get file by transfer request ID with user access validation
 */
export async function getFileByTransferRequestId(
    userId: string,
    transferRequestId: string
): Promise<SelectFile | null> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!transferRequestId) {
            throw new FileServiceError('Transfer request ID is required', 'MISSING_TRANSFER_REQUEST_ID', 400);
        }

        // Get file by transfer request ID
        const [file] = await db
            .select()
            .from(files)
            .where(eq(files.transferRequestId, transferRequestId))
            .limit(1);

        if (!file) {
            return null;
        }

        // Verify user has access to the file's message
        if (file.messageId) {
            const [message] = await db
                .select()
                .from(messages)
                .where(eq(messages.id, file.messageId))
                .limit(1);

            if (!message) {
                throw new FileServiceError('Associated message not found', 'MESSAGE_NOT_FOUND', 404);
            }

            // Verify user is a participant in the conversation
            const [participant] = await db
                .select()
                .from(conversationParticipants)
                .where(
                    and(
                        eq(conversationParticipants.conversationId, message.conversationId),
                        eq(conversationParticipants.userId, userId)
                    )
                )
                .limit(1);

            if (!participant) {
                throw new FileServiceError(
                    'You do not have access to this file',
                    'ACCESS_DENIED',
                    403
                );
            }
        }

        return file;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to get file by transfer request ID',
            'GET_FILE_BY_TRANSFER_REQUEST_ID_FAILED',
            500
        );
    }
}

/**
 * Update file upload status
 */
export async function updateFileStatus(
    userId: string,
    fileId: string,
    data: UpdateFileStatusData
): Promise<SelectFile> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!fileId) {
            throw new FileServiceError('File ID is required', 'MISSING_FILE_ID', 400);
        }

        if (!data.uploadStatus) {
            throw new FileServiceError('Upload status is required', 'MISSING_UPLOAD_STATUS', 400);
        }

        const validStatuses = ['pending', 'completed', 'failed'];
        if (!validStatuses.includes(data.uploadStatus)) {
            throw new FileServiceError(
                `Invalid upload status. Must be one of: ${validStatuses.join(', ')}`,
                'INVALID_UPLOAD_STATUS',
                400
            );
        }

        // Get file and verify access
        const file = await getFileById(userId, fileId);

        if (!file) {
            throw new FileServiceError('File not found', 'FILE_NOT_FOUND', 404);
        }

        // Update file status
        const [updatedFile] = await db
            .update(files)
            .set({ uploadStatus: data.uploadStatus })
            .where(eq(files.id, fileId))
            .returning();

        if (!updatedFile) {
            throw new FileServiceError('Failed to update file status', 'UPDATE_FILE_STATUS_FAILED', 500);
        }

        return updatedFile;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to update file status',
            'UPDATE_FILE_STATUS_FAILED',
            500
        );
    }
}

/**
 * Get all files for a message
 */
export async function getMessageFiles(
    userId: string,
    messageId: string
): Promise<SelectFile[]> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!messageId) {
            throw new FileServiceError('Message ID is required', 'MISSING_MESSAGE_ID', 400);
        }

        // Verify message exists and user has access
        const [message] = await db
            .select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1);

        if (!message) {
            throw new FileServiceError('Message not found', 'MESSAGE_NOT_FOUND', 404);
        }

        // Verify user is a participant in the conversation
        const [participant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, message.conversationId),
                    eq(conversationParticipants.userId, userId)
                )
            )
            .limit(1);

        if (!participant) {
            throw new FileServiceError(
                'You do not have access to this message',
                'ACCESS_DENIED',
                403
            );
        }

        // Get all files for the message
        const messageFiles = await db
            .select()
            .from(files)
            .where(eq(files.messageId, messageId));

        return messageFiles;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to get message files',
            'GET_MESSAGE_FILES_FAILED',
            500
        );
    }
}

/**
 * Delete a file record (does not delete from storage)
 */
export async function deleteFile(
    userId: string,
    fileId: string
): Promise<void> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!fileId) {
            throw new FileServiceError('File ID is required', 'MISSING_FILE_ID', 400);
        }

        // Get file and verify access
        const file = await getFileById(userId, fileId);

        if (!file) {
            throw new FileServiceError('File not found', 'FILE_NOT_FOUND', 404);
        }

        // Verify user is the sender of the associated message
        if (file.messageId) {
            const [message] = await db
                .select()
                .from(messages)
                .where(eq(messages.id, file.messageId))
                .limit(1);

            if (message && message.senderId !== userId) {
                throw new FileServiceError(
                    'You can only delete files from your own messages',
                    'NOT_MESSAGE_SENDER',
                    403
                );
            }
        }

        // Delete file record
        await db
            .delete(files)
            .where(eq(files.id, fileId));

    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to delete file',
            'DELETE_FILE_FAILED',
            500
        );
    }
}

/**
 * Create a file transfer request
 */
export async function createFileTransferRequest(
    data: CreateFileTransferRequestData
): Promise<SelectFileTransferRequest> {
    try {
        // Validate input
        if (!data.conversationId) {
            throw new FileServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        if (!data.senderId) {
            throw new FileServiceError('Sender ID is required', 'MISSING_SENDER_ID', 400);
        }

        if (!data.receiverId) {
            throw new FileServiceError('Receiver ID is required', 'MISSING_RECEIVER_ID', 400);
        }

        // Validate file properties
        validateFile(data.filename, data.fileSize, data.mimeType);

        // Verify sender is a participant in the conversation
        const [senderParticipant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, data.conversationId),
                    eq(conversationParticipants.userId, data.senderId),
                    isNull(conversationParticipants.leftAt)
                )
            )
            .limit(1);

        if (!senderParticipant) {
            throw new FileServiceError(
                'Sender is not a participant in this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Verify receiver is a participant in the conversation
        const [receiverParticipant] = await db
            .select()
            .from(conversationParticipants)
            .where(
                and(
                    eq(conversationParticipants.conversationId, data.conversationId),
                    eq(conversationParticipants.userId, data.receiverId),
                    isNull(conversationParticipants.leftAt)
                )
            )
            .limit(1);

        if (!receiverParticipant) {
            throw new FileServiceError(
                'Receiver is not a participant in this conversation',
                'RECEIVER_NOT_PARTICIPANT',
                403
            );
        }

        // Set expiration to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create file transfer request
        const requestData: InsertFileTransferRequest = {
            conversationId: data.conversationId,
            senderId: data.senderId,
            receiverId: data.receiverId,
            filename: data.filename,
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            status: 'pending',
            messageId: data.messageId,
            expiresAt,
        };

        const [newRequest] = await db
            .insert(fileTransferRequests)
            .values(requestData)
            .returning();

        if (!newRequest) {
            throw new FileServiceError('Failed to create file transfer request', 'CREATE_REQUEST_FAILED', 500);
        }

        return newRequest;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to create file transfer request',
            'CREATE_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Get file transfer request by ID with access verification
 */
export async function getFileTransferRequestById(
    userId: string,
    transferId: string
): Promise<SelectFileTransferRequest | null> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!transferId) {
            throw new FileServiceError('Transfer ID is required', 'MISSING_TRANSFER_ID', 400);
        }

        // Get file transfer request
        const [request] = await db
            .select()
            .from(fileTransferRequests)
            .where(eq(fileTransferRequests.id, transferId))
            .limit(1);

        if (!request) {
            return null;
        }

        // Verify user is either sender or receiver
        if (request.senderId !== userId && request.receiverId !== userId) {
            throw new FileServiceError(
                'You do not have access to this file transfer request',
                'ACCESS_DENIED',
                403
            );
        }

        return request;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to get file transfer request',
            'GET_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Accept a file transfer request
 */
export async function acceptFileTransferRequest(
    userId: string,
    transferId: string
): Promise<SelectFileTransferRequest> {
    try {
        // Get and verify request
        const request = await getFileTransferRequestById(userId, transferId);

        if (!request) {
            throw new FileServiceError('File transfer request not found', 'REQUEST_NOT_FOUND', 404);
        }

        // Verify user is the receiver
        if (request.receiverId !== userId) {
            throw new FileServiceError(
                'Only the receiver can accept this file transfer',
                'NOT_RECEIVER',
                403
            );
        }

        // Check if request is still pending
        if (request.status !== 'pending') {
            throw new FileServiceError(
                `File transfer request is already ${request.status}`,
                'INVALID_STATUS',
                400
            );
        }

        // Check if request has expired
        if (new Date() > new Date(request.expiresAt)) {
            // Update status to expired
            await db
                .update(fileTransferRequests)
                .set({ status: 'expired' })
                .where(eq(fileTransferRequests.id, transferId));

            throw new FileServiceError(
                'File transfer request has expired',
                'REQUEST_EXPIRED',
                400
            );
        }

        // Update status to accepted
        const [updatedRequest] = await db
            .update(fileTransferRequests)
            .set({ status: 'accepted' })
            .where(eq(fileTransferRequests.id, transferId))
            .returning();

        if (!updatedRequest) {
            throw new FileServiceError('Failed to accept file transfer request', 'ACCEPT_REQUEST_FAILED', 500);
        }

        return updatedRequest;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to accept file transfer request',
            'ACCEPT_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Decline a file transfer request
 */
export async function declineFileTransferRequest(
    userId: string,
    transferId: string
): Promise<SelectFileTransferRequest> {
    try {
        // Get and verify request
        const request = await getFileTransferRequestById(userId, transferId);

        if (!request) {
            throw new FileServiceError('File transfer request not found', 'REQUEST_NOT_FOUND', 404);
        }

        // Verify user is the receiver
        if (request.receiverId !== userId) {
            throw new FileServiceError(
                'Only the receiver can decline this file transfer',
                'NOT_RECEIVER',
                403
            );
        }

        // Check if request is still pending
        if (request.status !== 'pending') {
            throw new FileServiceError(
                `File transfer request is already ${request.status}`,
                'INVALID_STATUS',
                400
            );
        }

        // Update status to declined
        const [updatedRequest] = await db
            .update(fileTransferRequests)
            .set({ status: 'declined' })
            .where(eq(fileTransferRequests.id, transferId))
            .returning();

        if (!updatedRequest) {
            throw new FileServiceError('Failed to decline file transfer request', 'DECLINE_REQUEST_FAILED', 500);
        }

        return updatedRequest;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to decline file transfer request',
            'DECLINE_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Get file transfer request by message ID
 */
export async function getFileTransferRequestByMessageId(
    userId: string,
    messageId: string
): Promise<SelectFileTransferRequest | null> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!messageId) {
            throw new FileServiceError('Message ID is required', 'MISSING_MESSAGE_ID', 400);
        }

        // Get file transfer request by message ID
        const [request] = await db
            .select()
            .from(fileTransferRequests)
            .where(eq(fileTransferRequests.messageId, messageId))
            .limit(1);

        if (!request) {
            return null;
        }

        // Verify user is participant (sender or receiver)
        if (request.senderId !== userId && request.receiverId !== userId) {
            // Check if user is in the conversation
            const [participant] = await db
                .select()
                .from(conversationParticipants)
                .where(
                    and(
                        eq(conversationParticipants.conversationId, request.conversationId),
                        eq(conversationParticipants.userId, userId)
                    )
                )
                .limit(1);

            if (!participant) {
                throw new FileServiceError(
                    'User does not have access to this file transfer request',
                    'ACCESS_DENIED',
                    403
                );
            }
        }

        return request;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to get file transfer request',
            'GET_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Get all file transfer requests for a conversation
 * Returns requests where the user is either sender or receiver
 */
export async function getFileTransferRequestsByConversation(
    userId: string,
    conversationId: string
): Promise<SelectFileTransferRequest[]> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!conversationId) {
            throw new FileServiceError('Conversation ID is required', 'MISSING_CONVERSATION_ID', 400);
        }

        // Verify user is a participant of the conversation
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
            throw new FileServiceError(
                'User is not a participant of this conversation',
                'NOT_PARTICIPANT',
                403
            );
        }

        // Get all transfer requests for the conversation
        const requests = await db
            .select()
            .from(fileTransferRequests)
            .where(eq(fileTransferRequests.conversationId, conversationId))
            .orderBy(fileTransferRequests.createdAt);

        return requests;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to get file transfer requests',
            'GET_REQUESTS_FAILED',
            500
        );
    }
}

/**
 * Cancel a file transfer request
 * Can be called by either sender or receiver
 */
export async function cancelFileTransferRequest(
    userId: string,
    transferId: string
): Promise<SelectFileTransferRequest> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!transferId) {
            throw new FileServiceError('Transfer ID is required', 'MISSING_TRANSFER_ID', 400);
        }

        // Get and verify request
        const request = await getFileTransferRequestById(userId, transferId);

        if (!request) {
            throw new FileServiceError('File transfer request not found', 'REQUEST_NOT_FOUND', 404);
        }

        // Check if request can be cancelled (not already in terminal state)
        const terminalStates = ['completed', 'failed', 'declined', 'expired', 'cancelled'];
        if (terminalStates.includes(request.status)) {
            throw new FileServiceError(
                `Cannot cancel file transfer request with status "${request.status}"`,
                'INVALID_STATUS',
                400
            );
        }

        // Update status to cancelled
        const [updatedRequest] = await db
            .update(fileTransferRequests)
            .set({ status: 'cancelled' })
            .where(eq(fileTransferRequests.id, transferId))
            .returning();

        if (!updatedRequest) {
            throw new FileServiceError('Failed to cancel file transfer request', 'CANCEL_REQUEST_FAILED', 500);
        }

        return updatedRequest;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to cancel file transfer request',
            'CANCEL_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Update file transfer request status to completed or failed
 * Called after file upload completes or fails
 */
export async function updateFileTransferRequestStatus(
    userId: string,
    transferId: string,
    status: 'completed' | 'failed'
): Promise<SelectFileTransferRequest> {
    try {
        // Validate input
        if (!userId) {
            throw new FileServiceError('User ID is required', 'INVALID_USER_ID', 400);
        }

        if (!transferId) {
            throw new FileServiceError('Transfer ID is required', 'MISSING_TRANSFER_ID', 400);
        }

        if (!['completed', 'failed'].includes(status)) {
            throw new FileServiceError(
                'Status must be either "completed" or "failed"',
                'INVALID_STATUS',
                400
            );
        }

        // Get and verify request
        const request = await getFileTransferRequestById(userId, transferId);

        if (!request) {
            throw new FileServiceError('File transfer request not found', 'REQUEST_NOT_FOUND', 404);
        }

        // Verify user is the sender (only sender can complete/fail the upload)
        if (request.senderId !== userId) {
            throw new FileServiceError(
                'Only the sender can update the transfer status',
                'NOT_SENDER',
                403
            );
        }

        // Check if request is in accepted status (ready for upload)
        if (request.status !== 'accepted') {
            throw new FileServiceError(
                `Cannot update transfer request with status "${request.status}". Request must be accepted first.`,
                'INVALID_STATUS',
                400
            );
        }

        // Update status
        const [updatedRequest] = await db
            .update(fileTransferRequests)
            .set({ status })
            .where(eq(fileTransferRequests.id, transferId))
            .returning();

        if (!updatedRequest) {
            throw new FileServiceError('Failed to update file transfer request status', 'UPDATE_REQUEST_FAILED', 500);
        }

        return updatedRequest;
    } catch (error) {
        if (error instanceof FileServiceError) {
            throw error;
        }
        throw new FileServiceError(
            'Failed to update file transfer request status',
            'UPDATE_REQUEST_FAILED',
            500
        );
    }
}

/**
 * Clean up expired file transfer requests
 * This should be called periodically (e.g., via a cron job)
 */
export async function cleanupExpiredFileTransferRequests(): Promise<number> {
    try {
        const now = new Date();

        // Update expired pending requests
        const result = await db
            .update(fileTransferRequests)
            .set({ status: 'expired' })
            .where(
                and(
                    eq(fileTransferRequests.status, 'pending'),
                    lt(fileTransferRequests.expiresAt, now)
                )
            )
            .returning();

        return result.length;
    } catch (error) {
        throw new FileServiceError(
            'Failed to cleanup expired file transfer requests',
            'CLEANUP_FAILED',
            500
        );
    }
}
