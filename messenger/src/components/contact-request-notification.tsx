/**
 * Contact Request Notification Component
 * Displays pending contact requests with accept/decline buttons
 * Sends accept/decline requests to Backend Service API
 */

import { useState } from 'react';
import { acceptContactRequest, declineContactRequest } from '../lib/services/contact-service';
import { useAuthStore } from '../lib/store/auth-store';
import type { Contact } from '@/types';

interface ContactRequestNotificationProps {
    request: Contact;
    onAccept?: (requestId: string) => void;
    onDecline?: (requestId: string) => void;
}

export function ContactRequestNotification({
    request,
    onAccept,
    onDecline,
}: ContactRequestNotificationProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const token = useAuthStore((state) => state.token);

    if (!isVisible) return null;

    const handleAccept = async () => {
        if (!token) {
            setError('You must be logged in to accept contact requests');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Send accept request to Backend Service API
            await acceptContactRequest(request.id, token);

            // Call success callback if provided
            if (onAccept) {
                onAccept(request.id);
            }

            // Hide notification after successful accept
            setIsVisible(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept contact request';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!token) {
            setError('You must be logged in to decline contact requests');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Send decline request to Backend Service API
            await declineContactRequest(request.id, token);

            // Call success callback if provided
            if (onDecline) {
                onDecline(request.id);
            }

            // Hide notification after successful decline
            setIsVisible(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to decline contact request';
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="rounded p-3 mb-2 shadow-sm">
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
                    <p className="text-[9px] text-red-700">{error}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleAccept}
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Processing...' : 'Accept'}
                </button>
                <button
                    onClick={handleDecline}
                    disabled={isProcessing}
                >
                    {isProcessing ? 'Processing...' : 'Decline'}
                </button>
            </div>
        </div>
    );
}
