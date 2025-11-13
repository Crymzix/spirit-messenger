import { useState } from 'react';
import { useUser } from '../lib/store/auth-store';
import { Layout } from './layout';
import { UserProfile } from './user-profile';
import { ProfileSettings } from './profile-settings';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

interface MainWindowProps {
    onSignOut?: () => void;
}

type PresenceStatus = 'online' | 'away' | 'busy' | 'appear_offline';

export function MainWindow({ onSignOut }: MainWindowProps) {
    const user = useUser();
    const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('online');
    const [searchQuery, setSearchQuery] = useState('');
    const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

    const handleStatusChange = (status: PresenceStatus) => {
        setPresenceStatus(status);
        // TODO: Send status update to Backend Service (will be implemented in task 9.2)
    };

    const handleEditProfile = async () => {
        // TODO
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement search functionality (will be implemented in task 22.2)
        console.log('Search query:', searchQuery);
    };

    return (
        <Layout>
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* User Profile Section */}
                <UserProfile
                    presenceStatus={presenceStatus}
                    onStatusChange={handleStatusChange}
                    onEditProfile={handleEditProfile}
                />

                {/* Profile Settings Modal */}
                <ProfileSettings
                    isOpen={isProfileSettingsOpen}
                    onClose={() => setIsProfileSettingsOpen(false)}
                />

                {/* Search Bar */}
                <div className="p-2 border-b border-gray-300 bg-gray-50">
                    <form onSubmit={handleSearch} className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search contacts..."
                            className="w-full px-3 py-1.5 text-[11px] border border-gray-400 rounded focus:outline-none focus:border-msn-blue"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-msn-blue text-[10px]"
                        >
                            🔍
                        </button>
                    </form>
                </div>

                {/* Contact List Area - Placeholder */}
                <div className="flex-1 overflow-y-auto p-3">
                    <div className="text-center text-gray-500 text-[11px] mt-8">
                        <p>Contact list will be implemented in task 11.1</p>
                        <p className="mt-2 text-[10px]">
                            Current user: {user?.username}
                        </p>
                        <p className="text-[10px]">
                            Status: {presenceStatus}
                        </p>
                        {onSignOut && (
                            <button
                                onClick={onSignOut}
                                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-[11px]"
                            >
                                Sign Out
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
