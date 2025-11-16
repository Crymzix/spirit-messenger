import { useAcceptContactRequest, useDeclineContactRequest } from '../lib/hooks/contact-hooks';
import type { Contact } from '@/types';

interface ContactRequestNotificationProps {
    request: Contact;
}

export function ContactRequestNotification({
    request,
}: ContactRequestNotificationProps) {
    const acceptMutation = useAcceptContactRequest();
    const declineMutation = useDeclineContactRequest();

    const handleAccept = async () => {
        if (isProcessing) {
            return
        }
        try {
            await acceptMutation.mutateAsync(request.id);
        } catch (err) {
            // Error is already handled by React Query
            console.error('Failed to accept contact request:', err);
        }
    };

    const handleDecline = async () => {
        if (isProcessing) {
            return
        }
        try {
            await declineMutation.mutateAsync(request.id);
        } catch (err) {
            console.error('Failed to decline contact request:', err);
        }
    };

    const isProcessing = acceptMutation.isPending || declineMutation.isPending;
    const error = acceptMutation.error || declineMutation.error;

    return (
        <div className="p-3 mb-2">
            {/* Request Header */}
            <div className="flex items-center gap-2 mb-2">
                {/* Display Picture */}
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {request.contactUser.displayPictureUrl ? (
                        <img
                            src={request.contactUser.displayPictureUrl}
                            alt={request.contactUser.displayName || request.contactUser.username}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-[10px] text-gray-600">
                            {(request.contactUser.displayName || request.contactUser.username).charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                {/* Request Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-900 truncate">
                        {request.contactUser.displayName || request.contactUser.username}
                    </p>
                    <p className="text-[10px] text-gray-600 truncate">
                        {request.contactUser.email}
                    </p>
                </div>
            </div>

            {/* Request Message */}
            <p className="text-[10px] text-gray-700 mb-3">
                wants to add you as a contact
            </p>

            {/* Error Message */}
            {error && (
                <div className="mb-2 p-2 bg-red-50 border border-red-300 rounded">
                    <p className="text-[9px] text-red-700">
                        {error instanceof Error ? error.message : 'An error occurred'}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            {
                !isProcessing && (
                    <div className="flex gap-4">
                        <div
                            className='cursor-pointer font-verdana font-bold text-[#31497C]'
                            onClick={handleAccept}
                        >
                            Accept
                        </div>
                        <div
                            className='cursor-pointer font-verdana font-bold text-[#31497C]'
                            onClick={handleDecline}
                        >
                            Decline
                        </div>
                    </div>
                )
            }
        </div>
    );
}
