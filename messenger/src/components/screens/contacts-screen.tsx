import { useState, useEffect } from 'react';
import { useProfileSubscription } from '../../lib/hooks/profile-hooks';
import { Layout } from '../layout';
import { UserProfile } from '../user-profile';
import { ContactList } from '../contact-list';
import { PresenceStatus } from '@/types';
import { ContactsTabs } from '../contacts-tabs';
import { createWindow } from '@/lib/utils/window-utils';
import { AIChat } from '../ai-chat';
import { useUser } from '@/lib';

const tabs = [
    { icon: '/msn-person.png', color: 'fill-blue-400', label: 'Contacts' },
    { icon: '/msn-ai.png', color: 'fill-blue-400', label: 'AI' },
];

export function ContactsScreen() {
    const { data: user } = useUser();
    const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>(user?.presenceStatus || 'online');
    const [activeTab, setActiveTab] = useState(0);

    useProfileSubscription();

    // Sync local state with user's presence from store (updated via realtime subscription)
    useEffect(() => {
        if (user?.presenceStatus && user.presenceStatus !== presenceStatus) {
            setPresenceStatus(user.presenceStatus);
        }
    }, [user?.presenceStatus]);

    const onStatusChange = (status: PresenceStatus) => {
        setPresenceStatus(status);
    }

    const handleAddContact = () => {
        createWindow('add-contact', '/add-contact.html', {
            title: 'Add a Contact',
            width: 640,
            height: 500,
            resizable: false,
            decorations: false,
            transparent: true,
            center: true,
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
                    <ContactsTabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabSelected={setActiveTab}
                    />
                    <div
                        className='flex-1 m-[1px] border-[0.5px] border-[#B8C6EA] rounded'
                        style={{
                            boxShadow: 'inset 1px 1px 2px rgba(192, 201, 222, 0.8), inset 0 -1px 2px rgba(192, 201, 222, 0.8)'
                        }}
                    >
                        {
                            activeTab === 0 ? (
                                <>
                                    {/* Add Contacts */}
                                    <div
                                        onClick={handleAddContact}
                                        className='flex items-center px-2 cursor-pointer border-b-[1px] border-gray-200 bg-gradient-to-b from-[#B8C6EA] to-transparent rounded-t-lg mt-1 ml-2 mr-1 hover:from-[#C8D6FA] transition-colors'>
                                        <img src='/msn-add.png' className='size-12' />
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className='text-[#010050] !text-lg'>
                                            Add a Contact
                                        </div>
                                    </div>

                                    {/* Contact List Area */}
                                    <ContactList />
                                </>
                            ) : null
                        }
                        {
                            activeTab === 1 ? (
                                <AIChat />
                            ) : null
                        }
                    </div>
                </div>
            </div>
        </Layout>
    );
}
