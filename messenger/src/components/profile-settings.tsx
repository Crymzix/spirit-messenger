import { useState, useRef } from 'react';
import { useUser, useAuthStore } from '../lib/store/auth-store';

interface ProfileSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
    const user = useUser();
    const updateUser = useAuthStore((state) => state.updateUser);

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [personalMessage, setPersonalMessage] = useState(user?.personalMessage || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);

        try {
            // TODO: Call Backend Service API to update profile (will be implemented in task 8.3)
            // For now, just update local state
            updateUser({
                displayName: displayName.trim() || user?.username || '',
                personalMessage: personalMessage.trim(),
            });

            console.log('Profile updated:', { displayName, personalMessage });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset form to current user values
        setDisplayName(user?.displayName || '');
        setPersonalMessage(user?.personalMessage || '');
        setError(null);
        onClose();
    };

    const handleDisplayPictureUpdate = (url: string) => {
        updateUser({ displayPictureUrl: url });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
                ref={modalRef}
                className="bg-msn-bg border-2 border-gray-400 shadow-xl w-[480px] rounded"
                style={{ fontFamily: 'Tahoma, Arial, sans-serif' }}
            >
                {/* Title Bar */}
                <div className="bg-gradient-to-r from-[#0058E0] to-[#4A9EFF] px-2 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                            <span className="text-[8px] text-msn-blue">👤</span>
                        </div>
                        <span className="text-white text-[11px] font-bold">Edit Profile</span>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="text-white hover:bg-red-500 w-5 h-5 flex items-center justify-center text-[14px] font-bold rounded-sm transition-colors"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">

                    {/* Display Name Section */}
                    <div className="border border-gray-400 bg-white p-3 rounded">
                        <label htmlFor="displayName" className="block text-[11px] font-bold mb-2 text-gray-800">
                            Display Name
                        </label>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            maxLength={50}
                            className="w-full px-2 py-1.5 text-[11px] border border-gray-400 rounded focus:outline-none focus:border-msn-blue"
                            placeholder="Enter your display name"
                        />
                        <div className="text-[9px] text-gray-500 mt-1">
                            {displayName.length}/50 characters
                        </div>
                    </div>

                    {/* Personal Message Section */}
                    <div className="border border-gray-400 bg-white p-3 rounded">
                        <label htmlFor="personalMessage" className="block text-[11px] font-bold mb-2 text-gray-800">
                            Personal Message
                        </label>
                        <textarea
                            id="personalMessage"
                            value={personalMessage}
                            onChange={(e) => setPersonalMessage(e.target.value)}
                            maxLength={150}
                            rows={3}
                            className="w-full px-2 py-1.5 text-[11px] border border-gray-400 rounded focus:outline-none focus:border-msn-blue resize-none"
                            placeholder="What's on your mind?"
                        />
                        <div className="text-[9px] text-gray-500 mt-1">
                            {personalMessage.length}/150 characters
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-[10px]">
                            {error}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="border-t border-gray-400 bg-gradient-to-b from-[#ECE9D8] to-[#D6D3CE] px-4 py-3 flex justify-end gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-gradient-to-b from-white to-[#E0E0E0] border border-gray-400 rounded text-[11px] hover:from-[#F0F0F0] hover:to-[#D0D0D0] active:from-[#D0D0D0] active:to-[#C0C0C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-gradient-to-b from-white to-[#E0E0E0] border border-gray-400 rounded text-[11px] hover:from-[#F0F0F0] hover:to-[#D0D0D0] active:from-[#D0D0D0] active:to-[#C0C0C0] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
