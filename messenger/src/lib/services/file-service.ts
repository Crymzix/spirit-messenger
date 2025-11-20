/**
 * File Service
 * Handles file transfer operations with the Backend Service
 */

import { apiGet, apiPost, createAuthHeaders } from '../api-client';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:6666';

export interface FileTransferRequest {
    id: string;
    conversationId: string;
    senderId: string;
    receiverId: string | null;
    filename: string;
    fileSize: number;
    mimeType: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired' | 'failed' | 'cancelled';
    messageId: string;
    fileId: string | null;
    createdAt: Date;
    respondedAt: Date | null;
    expiresAt: Date;
}

export interface FileRecord {
    id: string;
    messageId: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
    uploadStatus: 'pending' | 'completed' | 'failed';
    createdAt: Date;
}

export interface InitiateFileTransferRequest {
    conversationId: string;
    receiverId: string | null;
    filename: string;
    fileSize: number;
    mimeType: string;
}

export interface InitiateFileTransferResponse {
    transferRequest: FileTransferRequest;
    message: {
        id: string;
        conversationId: string;
        senderId: string;
        content: string;
        messageType: string;
        metadata: any;
        createdAt: Date;
    };
}

export interface UploadFileRequest {
    transferId: string;
    file: File;
}

export interface UploadFileResponse {
    file: FileRecord;
    message: {
        id: string;
        conversationId: string;
        senderId: string;
        content: string;
        messageType: string;
        metadata: any;
        createdAt: Date;
    };
}

/**
 * Initiate a file transfer request
 */
export async function initiateFileTransfer(
    request: InitiateFileTransferRequest
): Promise<InitiateFileTransferResponse> {
    const response = await apiPost<InitiateFileTransferResponse>(
        '/api/files/initiate',
        request
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to initiate file transfer');
    }

    return response.data;
}

/**
 * Accept a file transfer request
 */
export async function acceptFileTransfer(
    transferId: string
): Promise<FileTransferRequest> {
    const response = await apiPost<{ transferRequest: FileTransferRequest }>(
        `/api/files/transfer/${transferId}/accept`,
        {}
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to accept file transfer');
    }

    return response.data.transferRequest;
}

/**
 * Decline a file transfer request
 */
export async function declineFileTransfer(
    transferId: string
): Promise<FileTransferRequest> {
    const response = await apiPost<{ transferRequest: FileTransferRequest }>(
        `/api/files/transfer/${transferId}/decline`,
        {}
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to decline file transfer');
    }

    return response.data.transferRequest;
}

/**
 * Cancel a file transfer request
 */
export async function cancelFileTransfer(
    transferId: string
): Promise<FileTransferRequest> {
    const response = await apiPost<{ transferRequest: FileTransferRequest }>(
        `/api/files/transfer/${transferId}/cancel`,
        {}
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to cancel file transfer');
    }

    return response.data.transferRequest;
}

/**
 * Upload a file after transfer has been accepted
 */
export async function uploadFile(
    request: UploadFileRequest,
    onProgress?: (progress: number) => void
): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append('transfer_id', request.transferId);
    formData.append('file', request.file);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = (e.loaded / e.total) * 100;
                    onProgress(progress);
                }
            });
        }

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success && response.data) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error || 'Upload failed'));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse response'));
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    reject(new Error(response.error || `Upload failed with status ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
        });

        xhr.open('POST', `${API_BASE_URL}/api/files/upload`);

        // Add auth headers
        const headers = createAuthHeaders();
        Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
        });

        xhr.send(formData);
    });
}

/**
 * Get all transfer requests for a conversation
 */
export async function getTransferRequests(
    conversationId: string
): Promise<FileTransferRequest[]> {
    const response = await apiGet<{ transferRequests: FileTransferRequest[] }>(
        `/api/files/conversation/${conversationId}/transfers`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch transfer requests');
    }

    return response.data.transferRequests;
}

/**
 * Get transfer request by message ID
 */
export async function getTransferRequestByMessageId(
    messageId: string
): Promise<FileTransferRequest | null> {
    const response = await apiGet<{ transferRequest: FileTransferRequest | null }>(
        `/api/files/message/${messageId}/transfer`
    );

    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch transfer request');
    }

    return response.data.transferRequest;
}

/**
 * Download a file by transfer request ID
 */
export async function downloadFile(
    transferId: string,
    filename: string
): Promise<void> {
    const headers = createAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/api/files/transfer/${transferId}/download`, {
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export const fileService = {
    initiateFileTransfer,
    acceptFileTransfer,
    declineFileTransfer,
    cancelFileTransfer,
    uploadFile,
    getTransferRequests,
    getTransferRequestByMessageId,
    downloadFile,
};
