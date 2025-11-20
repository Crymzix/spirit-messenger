/**
 * File Transfer Hooks
 * React Query hooks for file transfer operations
 */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import {
    fileService,
    InitiateFileTransferRequest,
    UploadFileRequest,
} from '../services/file-service';

/**
 * Query key factory for file transfer queries
 */
export const fileTransferKeys = {
    all: ['file-transfers'] as const,
    conversation: (conversationId: string) => [...fileTransferKeys.all, conversationId] as const,
    message: (messageId: string) => [...fileTransferKeys.all, 'message', messageId] as const,
};

/**
 * Hook to initiate a file transfer request
 */
export function useInitiateFileTransfer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: InitiateFileTransferRequest) =>
            fileService.initiateFileTransfer(request),
        onSuccess: (data) => {
            // Invalidate messages query to show the new transfer request message
            queryClient.invalidateQueries({
                queryKey: ['messages', data.message.conversationId],
            });
        },
        onError: (error) => {
            console.error('Failed to initiate file transfer:', error);
        },
    });
}

/**
 * Hook to accept a file transfer request
 */
export function useAcceptFileTransfer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (transferId: string) => fileService.acceptFileTransfer(transferId),
        onSuccess: () => {
            // Invalidate messages query to update transfer status
            queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
        onError: (error) => {
            console.error('Failed to accept file transfer:', error);
        },
    });
}

/**
 * Hook to decline a file transfer request
 */
export function useDeclineFileTransfer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (transferId: string) => fileService.declineFileTransfer(transferId),
        onSuccess: () => {
            // Invalidate messages query to update transfer status
            queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
        onError: (error) => {
            console.error('Failed to decline file transfer:', error);
        },
    });
}

/**
 * Hook to upload a file after transfer has been accepted
 */
export function useUploadFile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            request,
            onProgress,
        }: {
            request: UploadFileRequest;
            onProgress?: (progress: number) => void;
        }) => fileService.uploadFile(request, onProgress),
        onSuccess: (data) => {
            // Invalidate messages query to update transfer status
            queryClient.invalidateQueries({
                queryKey: ['messages', data.message.conversationId],
            });
        },
        onError: (error) => {
            console.error('Failed to upload file:', error);
        },
    });
}

/**
 * Hook to download a file by transfer request ID
 */
export function useDownloadFile() {
    return useMutation({
        mutationFn: ({ transferId, filename }: { transferId: string; filename: string }) =>
            fileService.downloadFile(transferId, filename),
        onError: (error) => {
            console.error('Failed to download file:', error);
        },
    });
}

/**
 * Hook to fetch and subscribe to file transfer requests for a conversation
 * Fetches all transfer requests and listens for real-time updates
 */
export function useFileTransferRequests(conversationId: string | undefined) {
    const queryClient = useQueryClient();

    // Fetch transfer requests for the conversation
    const query = useQuery({
        queryKey: fileTransferKeys.conversation(conversationId || ''),
        queryFn: () => fileService.getTransferRequests(conversationId!),
        enabled: !!conversationId,
    });

    // Subscribe to real-time updates
    useEffect(() => {
        if (!conversationId) return;

        const channel = supabase
            .channel(`file-transfers-${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'file_transfer_requests',
                    filter: `conversation_id=eq.${conversationId}`,
                },
                () => {
                    // Invalidate query to refetch updated data
                    queryClient.invalidateQueries({
                        queryKey: fileTransferKeys.conversation(conversationId),
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, queryClient]);

    return query;
}

/**
 * Hook to fetch and subscribe to a file transfer request by message ID
 * Fetches the transfer request and listens for real-time updates
 */
export function useFileTransferRequest(messageId: string | undefined) {
    const queryClient = useQueryClient();

    // Fetch transfer request for the message
    const query = useQuery({
        queryKey: fileTransferKeys.message(messageId || ''),
        queryFn: () => fileService.getTransferRequestByMessageId(messageId!),
        enabled: !!messageId,
    });

    // Subscribe to real-time updates
    useEffect(() => {
        if (!messageId || !query.data?.id) return;

        const transferId = query.data.id;

        const channel = supabase
            .channel(`file-transfer-${transferId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'file_transfer_requests',
                    filter: `id=eq.${transferId}`,
                },
                () => {
                    // Invalidate query to refetch updated data
                    queryClient.invalidateQueries({
                        queryKey: fileTransferKeys.message(messageId),
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [messageId, query.data?.id, queryClient]);

    return query;
}
