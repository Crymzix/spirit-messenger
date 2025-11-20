import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../lib/supabase.js';
import {
    createFile,
    getFileByTransferRequestId,
    validateFile,
    createFileTransferRequest,
    getFileTransferRequestById,
    getFileTransferRequestByMessageId,
    getFileTransferRequestsByConversation,
    acceptFileTransferRequest,
    declineFileTransferRequest,
    cancelFileTransferRequest,
    updateFileTransferRequestStatus,
    FileServiceError,
} from '../services/file-service.js';
import {
    createMessage,
    MessageServiceError,
} from '../services/message-service.js';
import type { ApiResponse } from '../types/index.js';
import { type SelectFile, type SelectMessage, type SelectFileTransferRequest, messages } from '../db/schema.js';
import { db } from '../db/client.js';
import { eq } from 'drizzle-orm';

interface FileUploadResponse {
    file: SelectFile;
    message: SelectMessage;
}

interface FileTransferInitiateResponse {
    transferRequest: SelectFileTransferRequest;
    message: SelectMessage;
}

const filesRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /api/files/initiate
    fastify.post<{
        Body: {
            conversationId: string;
            receiverId: string;
            filename: string;
            fileSize: number;
            mimeType: string;
        };
        Reply: ApiResponse<FileTransferInitiateResponse>;
    }>(
        '/initiate',
        {
            preHandler: fastify.authenticate,
            schema: {
                body: {
                    type: 'object',
                    required: ['conversationId', 'receiverId', 'filename', 'fileSize', 'mimeType'],
                    properties: {
                        conversationId: { type: 'string' },
                        receiverId: { type: 'string' },
                        filename: { type: 'string' },
                        fileSize: { type: 'number' },
                        mimeType: { type: 'string' }
                    }
                }
            }
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { conversationId, receiverId, filename, fileSize, mimeType } = request.body;

                // Validate file metadata
                try {
                    validateFile(filename, fileSize, mimeType);
                } catch (validationError) {
                    if (validationError instanceof FileServiceError) {
                        return reply.status(validationError.statusCode).send({
                            success: false,
                            error: validationError.message
                        });
                    }
                    throw validationError;
                }

                // Create message record with file transfer request metadata
                let message: SelectMessage;
                try {
                    message = await createMessage(userId, {
                        conversationId: conversationId,
                        content: `Wants to send a file: ${filename}`,
                        messageType: 'file',
                        metadata: {
                            fileTransferRequest: {
                                filename,
                                size: fileSize,
                                mimeType: mimeType,
                                status: 'pending'
                            }
                        }
                    });
                } catch (messageError) {
                    if (messageError instanceof MessageServiceError) {
                        return reply.status(messageError.statusCode).send({
                            success: false,
                            error: messageError.message
                        });
                    }
                    throw messageError;
                }

                // Create file transfer request
                let transferRequest: SelectFileTransferRequest;
                try {
                    transferRequest = await createFileTransferRequest({
                        conversationId: conversationId,
                        senderId: userId,
                        receiverId: receiverId,
                        filename,
                        fileSize: fileSize,
                        mimeType: mimeType,
                        messageId: message.id
                    });
                } catch (requestError) {
                    if (requestError instanceof FileServiceError) {
                        return reply.status(requestError.statusCode).send({
                            success: false,
                            error: requestError.message
                        });
                    }
                    throw requestError;
                }

                return reply.status(201).send({
                    success: true,
                    data: {
                        transferRequest,
                        message
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/files/upload
    fastify.post<{
        Reply: ApiResponse<FileUploadResponse>;
    }>(
        '/upload',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;

                // Get uploaded file and fields
                const data = await request.file();

                if (!data) {
                    return reply.status(400).send({
                        success: false,
                        error: 'No file uploaded'
                    });
                }

                // Get transfer_id from fields
                const transferIdField = data.fields.transfer_id;
                let transferId: string | undefined;

                if (transferIdField) {
                    // Handle both single value and array of values
                    if (typeof transferIdField === 'object' && 'value' in transferIdField) {
                        transferId = transferIdField.value as string;
                    } else if (typeof transferIdField === 'string') {
                        transferId = transferIdField;
                    }
                }

                if (!transferId || typeof transferId !== 'string') {
                    return reply.status(400).send({
                        success: false,
                        error: 'transfer_id is required'
                    });
                }

                // Get and verify transfer request
                let transferRequest: SelectFileTransferRequest | null;
                try {
                    transferRequest = await getFileTransferRequestById(userId, transferId);
                } catch (requestError) {
                    if (requestError instanceof FileServiceError) {
                        return reply.status(requestError.statusCode).send({
                            success: false,
                            error: requestError.message
                        });
                    }
                    throw requestError;
                }

                if (!transferRequest) {
                    return reply.status(404).send({
                        success: false,
                        error: 'File transfer request not found'
                    });
                }

                // Verify user is the sender
                if (transferRequest.senderId !== userId) {
                    return reply.status(403).send({
                        success: false,
                        error: 'Only the sender can upload the file'
                    });
                }

                // Verify transfer request is accepted
                if (transferRequest.status !== 'accepted') {
                    return reply.status(400).send({
                        success: false,
                        error: `File transfer must be accepted before upload. Current status: ${transferRequest.status}`
                    });
                }

                // Read file buffer
                const buffer = await data.toBuffer();
                const fileSize = buffer.length;
                const filename = data.filename;
                const mimeType = data.mimetype;

                // Validate file matches transfer request
                if (filename !== transferRequest.filename) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Uploaded filename does not match transfer request'
                    });
                }

                if (fileSize !== transferRequest.fileSize) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Uploaded file size does not match transfer request'
                    });
                }

                if (mimeType !== transferRequest.mimeType) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Uploaded file type does not match transfer request'
                    });
                }

                // Generate unique storage path
                // Format: {userId}/{conversationId}/{timestamp}-{filename}
                const timestamp = Date.now();
                const storagePath = `${userId}/${transferRequest.conversationId}/${timestamp}-${filename}`;

                // Upload file to Supabase Storage file-transfers bucket
                const { error: uploadError } = await supabase.storage
                    .from('file-transfers')
                    .upload(storagePath, buffer, {
                        contentType: mimeType,
                        upsert: false
                    });

                if (uploadError) {
                    fastify.log.error({ error: uploadError }, 'Supabase storage upload error');
                    // Update transfer request status to failed
                    try {
                        await updateFileTransferRequestStatus(userId, transferId, 'failed');
                    } catch (statusError) {
                        fastify.log.error({ error: statusError }, 'Failed to update transfer request status');
                    }
                    return reply.status(500).send({
                        success: false,
                        error: 'Failed to upload file to storage'
                    });
                }

                // Get the message associated with the transfer request
                if (!transferRequest.messageId) {
                    // Clean up uploaded file
                    await supabase.storage
                        .from('file-transfers')
                        .remove([storagePath]);

                    return reply.status(400).send({
                        success: false,
                        error: 'Transfer request has no associated message'
                    });
                }

                // Create file record in database
                let file: SelectFile;
                try {
                    file = await createFile(userId, {
                        messageId: transferRequest.messageId,
                        filename,
                        fileSize,
                        mimeType,
                        storagePath,
                        uploadStatus: 'completed',
                        transferRequestId: transferId
                    });
                } catch (fileError) {
                    // If file record creation fails, delete the uploaded file
                    await supabase.storage
                        .from('file-transfers')
                        .remove([storagePath]);

                    // Update transfer request status to failed
                    try {
                        await updateFileTransferRequestStatus(userId, transferId, 'failed');
                    } catch (statusError) {
                        fastify.log.error({ error: statusError }, 'Failed to update transfer request status');
                    }

                    if (fileError instanceof FileServiceError) {
                        return reply.status(fileError.statusCode).send({
                            success: false,
                            error: fileError.message
                        });
                    }
                    throw fileError;
                }

                // Update transfer request status to completed
                try {
                    await updateFileTransferRequestStatus(userId, transferId, 'completed');
                } catch (statusError) {
                    fastify.log.error({ error: statusError }, 'Failed to update transfer request status to completed');
                }

                // Get the message to return
                const [message] = await db
                    .select()
                    .from(messages)
                    .where(eq(messages.id, transferRequest.messageId))
                    .limit(1);

                if (!message) {
                    return reply.status(500).send({
                        success: false,
                        error: 'Failed to retrieve message'
                    });
                }

                return reply.status(201).send({
                    success: true,
                    data: {
                        file,
                        message
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/files/transfer/:transferId/accept
    fastify.post<{
        Params: { transferId: string };
        Reply: ApiResponse<{ transferRequest: SelectFileTransferRequest }>;
    }>(
        '/transfer/:transferId/accept',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { transferId } = request.params;

                // Accept the transfer request
                let transferRequest: SelectFileTransferRequest;
                try {
                    transferRequest = await acceptFileTransferRequest(userId, transferId);
                } catch (acceptError) {
                    if (acceptError instanceof FileServiceError) {
                        return reply.status(acceptError.statusCode).send({
                            success: false,
                            error: acceptError.message
                        });
                    }
                    throw acceptError;
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        transferRequest
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/files/transfer/:transferId/decline
    fastify.post<{
        Params: { transferId: string };
        Reply: ApiResponse<{ transferRequest: SelectFileTransferRequest }>;
    }>(
        '/transfer/:transferId/decline',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { transferId } = request.params;

                // Decline the transfer request
                let transferRequest: SelectFileTransferRequest;
                try {
                    transferRequest = await declineFileTransferRequest(userId, transferId);
                } catch (declineError) {
                    if (declineError instanceof FileServiceError) {
                        return reply.status(declineError.statusCode).send({
                            success: false,
                            error: declineError.message
                        });
                    }
                    throw declineError;
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        transferRequest
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // POST /api/files/transfer/:transferId/cancel
    fastify.post<{
        Params: { transferId: string };
        Reply: ApiResponse<{ transferRequest: SelectFileTransferRequest }>;
    }>(
        '/transfer/:transferId/cancel',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { transferId } = request.params;

                // Cancel the transfer request
                let transferRequest: SelectFileTransferRequest;
                try {
                    transferRequest = await cancelFileTransferRequest(userId, transferId);
                } catch (cancelError) {
                    if (cancelError instanceof FileServiceError) {
                        return reply.status(cancelError.statusCode).send({
                            success: false,
                            error: cancelError.message
                        });
                    }
                    throw cancelError;
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        transferRequest
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // GET /api/files/message/:messageId/transfer
    fastify.get<{
        Params: { messageId: string };
        Reply: ApiResponse<{ transferRequest: SelectFileTransferRequest | null }>;
    }>(
        '/message/:messageId/transfer',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { messageId } = request.params;

                // Get transfer request for the message
                let transferRequest: SelectFileTransferRequest | null;
                try {
                    transferRequest = await getFileTransferRequestByMessageId(userId, messageId);
                } catch (fetchError) {
                    if (fetchError instanceof FileServiceError) {
                        return reply.status(fetchError.statusCode).send({
                            success: false,
                            error: fetchError.message
                        });
                    }
                    throw fetchError;
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        transferRequest
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // GET /api/files/conversation/:conversationId/transfers
    fastify.get<{
        Params: { conversationId: string };
        Reply: ApiResponse<{ transferRequests: SelectFileTransferRequest[] }>;
    }>(
        '/conversation/:conversationId/transfers',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { conversationId } = request.params;

                // Get transfer requests for the conversation
                let transferRequests: SelectFileTransferRequest[];
                try {
                    transferRequests = await getFileTransferRequestsByConversation(userId, conversationId);
                } catch (fetchError) {
                    if (fetchError instanceof FileServiceError) {
                        return reply.status(fetchError.statusCode).send({
                            success: false,
                            error: fetchError.message
                        });
                    }
                    throw fetchError;
                }

                return reply.status(200).send({
                    success: true,
                    data: {
                        transferRequests
                    }
                });
            } catch (error) {
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );

    // GET /api/files/transfer/:transferId/download
    fastify.get<{
        Params: { transferId: string };
    }>(
        '/transfer/:transferId/download',
        {
            preHandler: fastify.authenticate,
        },
        async (request, reply) => {
            try {
                if (!request.user) {
                    return reply.status(401).send({
                        success: false,
                        error: 'Unauthorized'
                    });
                }

                const userId = request.user.id;
                const { transferId } = request.params;

                // Get file record by transfer request ID and verify user has access
                const file = await getFileByTransferRequestId(userId, transferId);

                if (!file) {
                    return reply.status(404).send({
                        success: false,
                        error: 'File not found'
                    });
                }

                // Check upload status
                if (file.uploadStatus !== 'completed') {
                    return reply.status(400).send({
                        success: false,
                        error: `File upload is ${file.uploadStatus}`
                    });
                }

                // Download file from Supabase Storage
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from('file-transfers')
                    .download(file.storagePath);

                if (downloadError || !fileData) {
                    fastify.log.error({ error: downloadError }, 'Supabase storage download error');
                    return reply.status(500).send({
                        success: false,
                        error: 'Failed to download file from storage'
                    });
                }

                // Convert Blob to Buffer for streaming
                const arrayBuffer = await fileData.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Set response headers for file download
                reply.header('Content-Type', file.mimeType);
                reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);
                reply.header('Content-Length', file.fileSize.toString());

                // Stream file to client
                return reply.send(buffer);
            } catch (error) {
                if (error instanceof FileServiceError) {
                    return reply.status(error.statusCode).send({
                        success: false,
                        error: error.message
                    });
                }

                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    error: 'Internal server error'
                });
            }
        }
    );
};

export default filesRoutes;
