import { useState } from 'react';
import { useUser } from '../lib/store/auth-store';
import { useProfileSubscription } from '../lib/hooks/profile-hooks';
import { usePendingContactRequests } from '../lib/hooks/contact-hooks';
import { Layout } from './layout';
import { UserProfile } from './user-profile';
import { ContactList } from './contact-list';
import { AddContactDialog } from './add-contact-dialog';
import { ContactRequestNotification } from './contact-request-notification';
import { PresenceStatus, Contact } from '@/types';

interface MainWindowProps {
    onSignOut?: () => void;
}

export function MainWindow({ onSignOut }: MainWindowProps) {
    const user = useUser();
    const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>(user?.presenceStatus || 'online');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);

    useProfileSubscription();
    const { pendingRequests, refetch: refetchPendingRequests } = usePendingContactRequests();

    const onStatusChange = (status: PresenceStatus) => {
        setPresenceStatus(status);
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
                    onStatusChange={onStatusChange}
                    onEditProfile={handleEditProfile}
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

                {/* Pending Contact Requests */}
                {pendingRequests.length > 0 && (
                    <div className="p-2 border-b border-gray-300 bg-white max-h-[200px] overflow-y-auto">
                        <div className="text-[10px] font-bold text-gray-700 mb-2 px-1">
                            Pending Requests ({pendingRequests.length})
                        </div>
                        {pendingRequests.map((request) => (
                            <ContactRequestNotification
                                key={request.id}
                                request={request}
                                onAccept={() => {
                                    console.log('Contact request accepted:', request.id);
                                    refetchPendingRequests();
                                }}
                                onDecline={() => {
                                    console.log('Contact request declined:', request.id);
                                    refetchPendingRequests();
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Contact List Area */}
                <ContactList
                    contacts={[]}
                    customGroups={[]}
                    onContactClick={(contact: Contact) => {
                        // TODO: Open chat window (will be implemented in task 15.1)
                        console.log('Contact clicked:', contact);
                    }}
                    onAddContact={() => {
                        setIsAddContactDialogOpen(true);
                    }}
                />
            </div>

            {/* Add Contact Dialog */}
            <AddContactDialog
                isOpen={isAddContactDialogOpen}
                onClose={() => setIsAddContactDialogOpen(false)}
                onSuccess={() => {
                    console.log('Contact request sent successfully');
                    // TODO: Refresh contact list when real-time subscriptions are implemented
                }}
            />
        </Layout>
    );
}
