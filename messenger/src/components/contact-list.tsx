import { useState } from 'react';
import { Contact, ContactGroup } from '@/types';
import { ContactItem } from './contact-item';

interface ContactListProps {
    contacts: Contact[];
    customGroups?: ContactGroup[];
    onContactClick?: (contact: Contact) => void;
    onAddContact?: () => void;
    onAddToGroup?: (contact: Contact) => void;
}

interface GroupedContacts {
    online: Contact[];
    offline: Contact[];
    blocked: Contact[];
    custom: Map<string, Contact[]>;
}

export function ContactList({
    contacts = [],
    customGroups = [],
    onContactClick,
    onAddContact,
    onAddToGroup
}: ContactListProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 border-b border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors"
            >
                <span className="text-[10px] text-gray-700">
                    {isCollapsed ? '▶' : '▼'}
                </span>
                <span className="text-[11px] font-bold text-gray-800">
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
        if (groupContacts.length === 0) return null;

        const isCollapsed = isGroupCollapsed(groupId);

        return (
            <div key={groupId} className="border-b border-gray-200">
                {renderGroupHeader(title, groupContacts.length, groupId)}
                {!isCollapsed && (
                    <div className="py-1">
                        {groupContacts.map((contact) => renderContactItem(contact))}
                    </div>
                )}
            </div>
        );
    };

    // Empty state
    if (contacts.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <div className="text-gray-500 text-[11px] mb-4">
                    <p className="mb-2">You don't have any contacts yet.</p>
                    <p className="text-[10px]">Add contacts to start chatting!</p>
                </div>
                {onAddContact && (
                    <button
                        onClick={onAddContact}
                        className="px-4 py-2 bg-msn-blue text-white rounded text-[11px] hover:bg-blue-700 transition-colors"
                    >
                        Add Contact
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-white">
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
    );
}
