/**
 * Add Contact Dialog Component
 * Allows users to add new contacts by email address
 * Validates email format and sends contact request to Backend Service
 */

import { useState } from 'react';
import { sendContactRequest } from '../lib/services/contact-service';
import { useAuthStore } from '../lib/store/auth-store';

interface AddContactDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddContactDialog({ isOpen, onClose, onSuccess }: AddContactDialogProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const token = useAuthStore((state) => state.token);

    if (!isOpen) return null;

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Validate email format
        if (!email.trim()) {
            setError('Please enter an email address');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (!token) {
            setError('You must be logged in to add contacts');
            return;
        }

        setIsLoading(true);

        try {
            // Send contact request to Backend Service
            await sendContactRequest(email.trim(), token);

            setSuccessMessage('Contact request sent successfully!');
            setEmail('');

            // Call success callback if provided
            if (onSuccess) {
                onSuccess();
            }

            // Close dialog after a short delay
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send contact request';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setError(null);
        setSuccessMessage(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded shadow-lg w-[400px] border border-gray-400">
                {/* Dialog Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-msn-blue to-blue-600 text-white">
                    <h2 className="text-[12px] font-bold">Add Contact</h2>
                    <button
                        onClick={handleClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded px-2 py-0.5 text-[11px]"
                        disabled={isLoading}
                    >
                        ✕
                    </button>
                </div>

                {/* Dialog Content */}
                <div className="p-4">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="contact-email" className="block text-[11px] font-bold text-gray-700 mb-2">
                                Enter contact's email address:
                            </label>
                            <input
                                id="contact-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@email.com"
                                className="w-full px-3 py-2 text-[11px] border border-gray-400 rounded focus:outline-none focus:border-msn-blue"
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-2 bg-red-50 border border-red-300 rounded">
                                <p className="text-[10px] text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {successMessage && (
                            <div className="mb-4 p-2 bg-green-50 border border-green-300 rounded">
                                <p className="text-[10px] text-green-700">{successMessage}</p>
                            </div>
                        )}

                        {/* Dialog Actions */}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-1.5 text-[11px] border border-gray-400 rounded hover:bg-gray-100 transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-1.5 text-[11px] bg-msn-blue text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Add Contact'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
