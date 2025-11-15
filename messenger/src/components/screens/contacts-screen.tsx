import { useState } from 'react';
import { useUser } from '../../lib/store/auth-store';
import { useProfileSubscription } from '../../lib/hooks/profile-hooks';
import { Layout } from '../layout';
import { UserProfile } from '../user-profile';
import { ContactList } from '../contact-list';
import { PresenceStatus, Contact } from '@/types';
import { ContactsTabs } from '../contacts-tabs';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

interface ContactsScreenProps {
    onSignOut?: () => void;
}

export function ContactsScreen({ onSignOut }: ContactsScreenProps) {
    const user = useUser();
    const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>(user?.presenceStatus || 'online');
    const [searchQuery, setSearchQuery] = useState('');

    useProfileSubscription();

    const onStatusChange = (status: PresenceStatus) => {
        setPresenceStatus(status);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Implement search functionality (will be implemented in task 22.2)
        console.log('Search query:', searchQuery);
    };

    const handleAddContact = () => {
        // In dev mode, use the full dev server URL; in production, use the relative path
        const isDev = window.location.hostname === 'localhost';
        const url = isDev
            ? 'http://localhost:1420/add-contact.html'
            : '/add-contact.html';

        const addContactWindow = new WebviewWindow('add-contact', {
            url,
            title: 'Add a Contact',
            width: 640,
            height: 500,
            resizable: false,
            decorations: false,
            transparent: true,
            center: true,
        });

        addContactWindow.once('tauri://created', () => {
            console.log('Add Contact window created');
        });

        addContactWindow.once('tauri://error', (e) => {
            console.error('Error creating window:', e);
        });
    }

    return (
        <Layout>
            {/* Main Content Area */}
            <div className="bg-white">
                {/* User Profile Section */}
                <UserProfile
                    presenceStatus={presenceStatus}
                    onStatusChange={onStatusChange}
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
                        <div
                            onClick={handleAddContact}
                            className='flex items-center px-2 cursor-pointer border-b-[1px] border-gray-200 bg-gradient-to-b from-[#B8C6EA] to-transparent rounded-t-lg mt-1 ml-2 mr-1'>
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
                        />
                    </div>
                </div>
            </div>
        </Layout>
    );
}
