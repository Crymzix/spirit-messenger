import { useState } from 'react';
import { useUser } from '../../lib/store/auth-store';
import { useProfileSubscription } from '../../lib/hooks/profile-hooks';
import { Layout } from '../layout';
import { UserProfile } from '../user-profile';
import { ContactList } from '../contact-list';
import { AddContactDialog } from '../add-contact-dialog';
import { PresenceStatus, Contact } from '@/types';
import { ContactsTabs } from '../contacts-tabs';

interface ContactsScreenProps {
    onSignOut?: () => void;
}

export function ContactsScreen({ onSignOut }: ContactsScreenProps) {
    const user = useUser();
    const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>(user?.presenceStatus || 'online');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);

    useProfileSubscription();


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
            <div className="bg-white">
                {/* User Profile Section */}
                <UserProfile
                    presenceStatus={presenceStatus}
                    onStatusChange={onStatusChange}
                    onEditProfile={handleEditProfile}
                />

                <div className='flex relative'>
                    <ContactsTabs />
                    <div
                        className='flex-1 m-[1px] border-[0.5px] border-[#B8C6EA] rounded'
                        style={{
                            boxShadow: 'inset 1px 1px 2px rgba(192, 201, 222, 0.8), inset 0 -1px 2px rgba(192, 201, 222, 0.8)'
                        }}
                    >
                        {/* Add Contacts */}
                        <div className='flex items-center px-2 cursor-pointer border-b-[1px] border-gray-200 bg-gradient-to-b from-[#B8C6EA] to-transparent rounded-t-lg mt-1 ml-2 mr-1'>
                            <img src='/msn-add.png' className='size-12' />
                            <div
                                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                className='text-[#010050] !text-lg'>
                                Add a Contact
                            </div>
                        </div>

                        {/* Contact List Area */}
                        <ContactList
                            onContactClick={(contact: Contact) => {
                                // TODO: Open chat window (will be implemented in task 15.1)
                                console.log('Contact clicked:', contact);
                            }}
                            onAddContact={() => {
                                setIsAddContactDialogOpen(true);
                            }}
                        />
                    </div>
                </div>
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
