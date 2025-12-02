import { useUser } from '@/lib';
import { MessageWithSender } from '@/lib/services/message-service';
import { useAcceptFileTransfer, useCancelFileTransfer, useDeclineFileTransfer, useDownloadFile, useFileTransferRequest } from '@/lib/hooks/file-hooks';
import { KeyboardEventHandler, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useFileUploadStore, FileUploadProgressPayload, FileUploadCompletePayload } from '@/lib/store/file-upload-store';

interface FileTransferRequestProps {
    message: MessageWithSender
}

type TransferDisplayStatus =
    | 'pending'
    | 'accepted'
    | 'uploading'
    | 'completed'
    | 'failed'
    | 'declined'
    | 'expired'
    | 'cancelled';

export function FileTransferRequestMessage({
    message,
}: FileTransferRequestProps) {
    const user = useUser()

    const {
        data: transferRequest,
    } = useFileTransferRequest(message.id);

    const acceptTransferMutation = useAcceptFileTransfer();
    const declineTransferMutation = useDeclineFileTransfer();
    const cancelTransferMutation = useCancelFileTransfer();
    const downloadFileMutation = useDownloadFile();
    const emitFileUploadStart = useFileUploadStore((state) => state.emitFileUploadStart);

    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'failed'>('idle');

    const isSender = message.senderId === user?.id;

    // Derive the display status from transfer request status and upload status
    const getDisplayStatus = (): TransferDisplayStatus => {
        if (!transferRequest) return 'pending';

        // Check terminal states first
        if (transferRequest.status === 'declined') return 'declined';
        if (transferRequest.status === 'expired') return 'expired';
        if (transferRequest.status === 'cancelled') return 'cancelled';
        if (transferRequest.status === 'failed' || uploadStatus === 'failed') return 'failed';
        if (transferRequest.status === 'completed' || uploadStatus === 'completed') return 'completed';

        // Check active states
        if (uploadStatus === 'uploading') return 'uploading';
        if (transferRequest.status === 'accepted') return 'accepted';

        return 'pending';
    };

    const displayStatus = getDisplayStatus();

    // Listen for upload progress and completion events from main window
    useEffect(() => {
        if (!transferRequest?.id) return;

        const setupListeners = async () => {
            const unlistenProgress = await listen<FileUploadProgressPayload>(
                'file-upload-progress',
                (event) => {
                    if (event.payload.transferId === transferRequest.id) {
                        setUploadProgress(event.payload.progress);
                        setUploadStatus('uploading');
                    }
                }
            );

            const unlistenComplete = await listen<FileUploadCompletePayload>(
                'file-upload-complete',
                (event) => {
                    if (event.payload.transferId === transferRequest.id) {
                        if (event.payload.success) {
                            setUploadStatus('completed');
                            setUploadProgress(100);
                        } else {
                            setUploadStatus('failed');
                        }
                    }
                }
            );

            return () => {
                unlistenProgress();
                unlistenComplete();
            };
        };

        const cleanup = setupListeners();
        return () => {
            cleanup.then((fn) => fn());
        };
    }, [transferRequest?.id]);

    // When transfer is accepted and user is sender, trigger upload from main window
    useEffect(() => {
        if (
            transferRequest?.status === 'accepted' &&
            isSender &&
            uploadStatus === 'idle'
        ) {
            emitFileUploadStart(transferRequest.id);
        }
    }, [transferRequest?.status, isSender, uploadStatus, emitFileUploadStart, transferRequest?.id]);

    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return `0 B`
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const getMimeTypeIcon = (mimeType?: string): string => {
        if (!mimeType) {
            return '/file-icons/file.png';
        }
        if (mimeType.startsWith('image/gif')) {
            return '/file-icons/gif.png';
        }
        if (mimeType.startsWith('image/')) {
            return '/file-icons/image.png';
        }
        if (mimeType.startsWith('audio/')) {
            return '/file-icons/audio.png';
        }
        if (mimeType.startsWith('text/')) {
            return '/file-icons/text.png';
        }
        return '/file-icons/file.png';
    }

    const handleAcceptTransfer = async () => {
        if (!transferRequest) return;
        try {
            await acceptTransferMutation.mutateAsync(transferRequest.id);
        } catch (error) {
            console.error('Failed to accept file transfer:', error);
        }
    };

    const handleDeclineTransfer = async () => {
        if (!transferRequest) return;
        try {
            await declineTransferMutation.mutateAsync(transferRequest.id);
        } catch (error) {
            console.error('Failed to decline file transfer:', error);
        }
    };

    const handleDownloadFile = async () => {
        if (!transferRequest) return;
        try {
            await downloadFileMutation.mutateAsync({
                transferId: transferRequest.id,
                filename: transferRequest.filename
            });
        } catch (error) {
            console.error('Failed to download file:', error);
        }
    };

    const handleCancelTransfer = async () => {
        if (!transferRequest) return;
        try {
            await cancelTransferMutation.mutateAsync(transferRequest.id);
        } catch (error) {
            console.error('Failed to cancel file transfer:', error);
        }
    };

    // Progress bar component for upload/download
    const ProgressBar = ({ progress, statusText }: { progress: number; statusText: string }) => (
        <div className="flex flex-col gap-1 p-2">
            <div className="flex w-96 bg-white h-6 border-[1px] border-black relative">
                <div
                    className="h-full bg-[#0078D7] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
                <div className="text-[8px] absolute inset-0 flex items-center justify-center">
                    {statusText}
                </div>
            </div>
        </div>
    );

    // Status message component
    const StatusMessage = ({ children }: { children: React.ReactNode }) => (
        <div className="flex items-center text-black !italic !font-verdana">
            {children}
        </div>
    );

    // Action link component
    const ActionLink = ({ onClick, label, shortcut, onKeyDown }: {
        onClick?: () => void;
        onKeyDown?: KeyboardEventHandler<HTMLDivElement>
        label: string;
        shortcut: string
    }) => (
        <div
            onClick={onClick}
            className="cursor-pointer flex items-center"
            onKeyDown={onKeyDown}
        >
            {label}
            <div className="text-gray-600">({shortcut})</div>
        </div>
    );

    // Render sender-specific UI
    const renderSenderView = () => {
        switch (displayStatus) {
            case 'pending':
                return (
                    <>
                        <StatusMessage>Waiting for acceptance...</StatusMessage>
                        <ActionLink
                            onKeyDown={e => {
                                if (e.altKey && e.key === 'q') {
                                    handleCancelTransfer()
                                }
                            }}
                            onClick={handleCancelTransfer}
                            label="Cancel"
                            shortcut="Alt+Q"
                        />
                    </>
                );
            case 'accepted':
                return (
                    <>
                        <ProgressBar progress={0} statusText="Preparing upload..." />
                        <ActionLink
                            onKeyDown={e => {
                                if (e.altKey && e.key === 'q') {
                                    handleCancelTransfer()
                                }
                            }}
                            onClick={handleCancelTransfer}
                            label="Cancel"
                            shortcut="Alt+Q"
                        />
                    </>
                );
            case 'uploading':
                return (
                    <>
                        <ProgressBar progress={uploadProgress} statusText={`Uploading... ${uploadProgress}%`} />
                        <ActionLink
                            onKeyDown={e => {
                                if (e.altKey && e.key === 'q') {
                                    handleCancelTransfer()
                                }
                            }}
                            onClick={handleCancelTransfer}
                            label="Cancel"
                            shortcut="Alt+Q"
                        />
                    </>
                );
            case 'completed':
                return <StatusMessage>Transfer completed</StatusMessage>;
            case 'failed':
                return <StatusMessage>Transfer failed</StatusMessage>;
            case 'declined':
                return <StatusMessage>Transfer declined</StatusMessage>;
            case 'expired':
                return <StatusMessage>Transfer expired</StatusMessage>;
            case 'cancelled':
                return <StatusMessage>Transfer cancelled</StatusMessage>;
            default:
                return null;
        }
    };

    // Render receiver-specific UI
    const renderReceiverView = () => {
        switch (displayStatus) {
            case 'pending':
                return (
                    <div className='flex gap-1'>
                        <ActionLink
                            onClick={handleAcceptTransfer}
                            onKeyDown={e => {
                                if (e.altKey && e.key === 'w') {
                                    handleAcceptTransfer()
                                }
                            }}
                            label="Accept"
                            shortcut="Alt+W"
                        />
                        <ActionLink
                            onKeyDown={e => {
                                if (e.altKey && e.key === 'q') {
                                    handleDeclineTransfer()
                                }
                            }}
                            onClick={handleDeclineTransfer}
                            label="Decline"
                            shortcut="Alt+Q"
                        />
                    </div>
                );
            case 'accepted':
            case 'uploading':
                return (
                    <>
                        <ProgressBar
                            progress={uploadProgress}
                            statusText={displayStatus === 'uploading' ? `Receiving... ${uploadProgress}%` : "Waiting for sender..."}
                        />
                        <ActionLink
                            onKeyDown={e => {
                                if (e.altKey && e.key === 'q') {
                                    handleCancelTransfer()
                                }
                            }}
                            onClick={handleCancelTransfer}
                            label="Cancel"
                            shortcut="Alt+Q"
                        />
                    </>
                );
            case 'completed':
                return (
                    <ActionLink
                        onKeyDown={e => {
                            if (e.altKey && e.key === 'p') {
                                handleDownloadFile()
                            }
                        }}
                        onClick={handleDownloadFile}
                        label="Open"
                        shortcut="Alt+P"
                    />
                );
            case 'failed':
                return <StatusMessage>Transfer failed</StatusMessage>;
            case 'declined':
                return <StatusMessage>Transfer declined</StatusMessage>;
            case 'expired':
                return <StatusMessage>Transfer expired</StatusMessage>;
            case 'cancelled':
                return <StatusMessage>Transfer cancelled</StatusMessage>;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col gap-0.5 py-2">
            {/* File info header */}
            <div
                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                className="flex-1 flex items-center gap-1"
            >
                <div className="truncate !text-[11px]">
                    {message?.metadata.fileTransferRequest?.filename}
                </div>
                <div className="!text-[11px]">
                    ({formatFileSize(message?.metadata.fileTransferRequest?.size)})
                </div>
            </div>

            {/* File icon */}
            <div>
                <img
                    className="w-[64px]"
                    src={getMimeTypeIcon(message?.metadata.fileTransferRequest?.mimeType)}
                    alt="File type icon"
                />
            </div>

            {/* Actions/Status based on role */}
            <div
                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                className="flex flex-col flex-wrap gap-2 !text-[11px] text-[#2F1AFF]"
            >
                {isSender ? renderSenderView() : renderReceiverView()}
            </div>
        </div>
    );
}
