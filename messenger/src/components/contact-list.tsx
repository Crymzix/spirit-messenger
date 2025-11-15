import { useState } from 'react';
import { Contact } from '@/types';
import { ContactItem } from './contact-item';
import { usePendingContactRequests } from '@/lib/hooks/contact-hooks';
import { placeholderContactGroups, placeholderContacts, placeholderPendingRequests } from '@/lib/placeholder-data';
import { ContactRequestNotification } from './contact-request-notification';

interface ContactListProps {
    onContactClick?: (contact: Contact) => void;
    onAddToGroup?: (contact: Contact) => void;
}

interface GroupedContacts {
    online: Contact[];
    offline: Contact[];
    blocked: Contact[];
    custom: Map<string, Contact[]>;
}

export function ContactList({
    onContactClick,
    onAddToGroup
}: ContactListProps) {
    const { pendingRequests, refetch: refetchPendingRequests } = usePendingContactRequests();
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // TODO: Remove placeholder data when real data is available
    const contacts = placeholderContacts;
    const customGroups = placeholderContactGroups;
    const displayPendingRequests = pendingRequests.length > 0 ? pendingRequests : placeholderPendingRequests;

    // Group contacts by status
    const groupedContacts: GroupedContacts = contacts.reduce(
        (acc, contact) => {
            if (contact.status === 'blocked') {
                acc.blocked.push(contact);
            } else if (
                contact.contactUser.presenceStatus === 'online' ||
                contact.contactUser.presenceStatus === 'away' ||
                contact.contactUser.presenceStatus === 'busy'
            ) {
                acc.online.push(contact);
            } else {
                acc.offline.push(contact);
            }
            return acc;
        },
        { online: [], offline: [], blocked: [], custom: new Map() } as GroupedContacts
    );

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const isGroupCollapsed = (groupId: string) => collapsedGroups.has(groupId);

    const renderContactItem = (contact: Contact) => {
        return (
            <ContactItem
                key={contact.id}
                contact={contact}
                onClick={onContactClick}
                onAddToGroup={onAddToGroup}
            />
        );
    };

    const renderGroupHeader = (title: string, count: number, groupId: string) => {
        const isCollapsed = isGroupCollapsed(groupId);

        return (
            <div
                onClick={() => toggleGroup(groupId)}
                className="flex items-center gap-1 px-1 py-1 cursor-pointer transition-colors"
            >
                <span className="text-[10px] text-gray-700">
                    {
                        isCollapsed ?
                            <img src='/group-plus.png' className='size-10' /> :
                            <img src='/group-minus.png' className='size-10' />
                    }
                </span>
                <span
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                    className="text-[11px] font-bold text-[#00005D]"
                >
                    {title} ({count})
                </span>
            </div>
        );
    };

    const renderGroup = (
        title: string,
        groupContacts: Contact[],
        groupId: string
    ) => {
        if (groupContacts.length === 0) {
            return null;
        }

        const isCollapsed = isGroupCollapsed(groupId);

        return (
            <div key={groupId}>
                {renderGroupHeader(title, groupContacts.length, groupId)}
                {!isCollapsed && (
                    <div className="py-1">
                        {groupContacts.map((contact) => renderContactItem(contact))}
                    </div>
                )}
            </div>
        );
    };

    const renderPendingInvites = () => {
        if (displayPendingRequests.length === 0) {
            return
        }

        const groupId = '_pending-invites'
        const isCollapsed = isGroupCollapsed(groupId);

        return (
            <div key={groupId} className="border-b border-gray-200">
                {renderGroupHeader('Pending Requests', displayPendingRequests.length, groupId)}
                {!isCollapsed && (
                    <div className="py-1">
                        {displayPendingRequests.map((request) => (
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
            </div>
        );
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto h-[calc(100vh-210px)]">
                {/* Pending Contact Requests */}
                {renderPendingInvites()}

                {/* Online Contacts */}
                {renderGroup('Online', groupedContacts.online, 'online')}

                {/* Custom Groups */}
                {customGroups.map((group) => {
                    const groupContacts = groupedContacts.custom.get(group.id) || [];
                    return renderGroup(group.name, groupContacts, `custom-${group.id}`);
                })}

                {/* Offline Contacts */}
                {renderGroup('Offline', groupedContacts.offline, 'offline')}

                {/* Blocked Contacts */}
                {renderGroup('Blocked', groupedContacts.blocked, 'blocked')}
            </div>
        </>
    );
}
