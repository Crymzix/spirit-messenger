import { useUser } from '@/lib';
import { MessageWithSender } from '@/lib/services/message-service';
import { useAcceptFileTransfer, useDeclineFileTransfer, useDownloadFile, useFileTransferRequest, useUploadFile } from '@/lib/hooks/file-hooks';
import { useEffect, useState } from 'react';

interface FileTransferRequestProps {
    message: MessageWithSender
}

export function FileTransferRequestMessage({
    message,
}: FileTransferRequestProps) {
    const user = useUser()

    const {
        data: transferRequest,
    } = useFileTransferRequest(message.id);

    const acceptTransferMutation = useAcceptFileTransfer();
    const declineTransferMutation = useDeclineFileTransfer();
    const uploadFileMutation = useUploadFile();
    const downloadFileMutation = useDownloadFile();

    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [selectedFile,] = useState<File | null>(null);

    useEffect(() => {
        if (transferRequest?.status === 'accepted' && selectedFile) {
            handleUploadFile(transferRequest.id, selectedFile);
        }
    }, [transferRequest?.status]);

    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return `0 B`
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const getStatusText = () => {
        if (message.senderId === user?.id) {
            return 'Not yet accepted'
        } else {
            return 'Double-click here to start the transfer';
        }
    };

    const getMimeTypeIcon = (mimeType?: string): string => {
        if (!mimeType) {
            return '/file-icons/file.png';
        }
        // Image files
        if (mimeType.startsWith('image/gif')) {
            return '/file-icons/gif.png';
        }
        if (mimeType.startsWith('image/')) {
            return '/file-icons/image.png';
        }

        // Audio files
        if (mimeType.startsWith('audio/')) {
            return '/file-icons/audio.png';
        }

        // Text files
        if (mimeType.startsWith('text/')) {
            return '/file-icons/text.png';
        }

        // Default fallback for unknown types
        return '/file-icons/file.png';
    }

    const handleAcceptTransfer = async () => {
        if (!transferRequest) {
            return
        }
        try {
            await acceptTransferMutation.mutateAsync(transferRequest.id);
        } catch (error) {
            console.error('Failed to accept file transfer:', error);
        }
    };

    const handleDeclineTransfer = async () => {
        if (!transferRequest) {
            return
        }
        try {
            await declineTransferMutation.mutateAsync(transferRequest.id);
        } catch (error) {
            console.error('Failed to decline file transfer:', error);
        }
    };

    const handleDownloadFile = async () => {
        if (!transferRequest) {
            return
        }
        try {
            await downloadFileMutation.mutateAsync({ transferId: transferRequest.id, filename: transferRequest.filename });
        } catch (error) {
            console.error('Failed to download file:', error);
        }
    };

    const handleUploadFile = async (transferId: string, file: File) => {
        try {
            await uploadFileMutation.mutateAsync({
                request: { transferId, file },
                onProgress: (progress) => {
                    setUploadProgress(progress);
                },
            });

            setUploadProgress(0);
        } catch (error) {
            console.error('Failed to upload file:', error);
            alert('Failed to upload file. Please try again.');
        }
    };

    return (
        <div className="flex flex-col gap-0.5 py-2">
            <div
                style={{
                    fontFamily: 'Pixelated MS Sans Serif',
                }}
                className="flex-1 flex items-center gap-1"
            >
                <div className="truncate !text-[11px]">
                    {message?.metadata.fileTransferRequest?.filename}
                </div>
                <div className="!text-[11px]">
                    ({formatFileSize(message?.metadata.fileTransferRequest?.size)})
                </div>
            </div>

            {
                transferRequest?.status === 'declined' ?
                    <>
                        <div
                            className='italic font-verdana'
                        >
                            Transfer declined
                        </div>
                    </> :
                    <>
                        <div className="flex flex-col gap-1 p-2">
                            <div className="flex w-96 bg-white h-6 border-[1px] border-black relative">
                                <div
                                    className={`h-full transition-all duration-300`}
                                    style={{ width: `${uploadProgress}%` }}
                                />
                                <div className="text-[8px] absolute inset-0 flex items-center justify-center">
                                    {getStatusText()}
                                </div>
                            </div>
                        </div>

                        <div>
                            <img
                                className='w-[64px]'
                                src={getMimeTypeIcon(message?.metadata.fileTransferRequest?.mimeType)} />
                        </div>

                        <div
                            style={{
                                fontFamily: 'Pixelated MS Sans Serif',
                            }}
                            className='flex items-center flex-wrap gap-2 !text-[11px] text-[#2F1AFF]'
                        >
                            {
                                message.senderId === user?.id ?
                                    <>
                                        <div className='cursor-pointer flex items-center'>
                                            Cancel
                                            <div className='text-gray-600'>
                                                (Alt+Q)
                                            </div>
                                        </div>
                                    </> :
                                    <>
                                        {
                                            transferRequest?.status === 'completed' ?
                                                <div
                                                    onClick={handleDownloadFile}
                                                    className='cursor-pointer flex items-center'>
                                                    Open
                                                    <div className='text-gray-600'>
                                                        (Alt+P)
                                                    </div>
                                                </div> :
                                                transferRequest?.status === 'failed' ?
                                                    <div
                                                        className='flex items-center text-black'>
                                                        Transfer failed
                                                    </div> :
                                                    <>
                                                        <div
                                                            onClick={handleAcceptTransfer}
                                                            className='cursor-pointer flex items-center'>
                                                            Accept
                                                            <div className='text-gray-600'>
                                                                (Alt+W)
                                                            </div>
                                                        </div>
                                                        <div
                                                            onClick={handleDeclineTransfer}
                                                            className='cursor-pointer flex items-center'>
                                                            Decline
                                                            <div className='text-gray-600'>
                                                                (Alt+Q)
                                                            </div>
                                                        </div>
                                                    </>
                                        }
                                    </>
                            }
                        </div>
                    </>
            }
        </div>
    );
}
