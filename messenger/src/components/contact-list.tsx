import { useEffect, useMemo, useState } from 'react';
import { Contact } from '@/types';
import { ContactItem } from './contact-item';
import { usePendingContactRequests, useContactRealtimeUpdates, useContacts } from '@/lib/hooks/contact-hooks';
import { useContactGroups, useContactGroupMemberships, useContactGroupRealtimeUpdates } from '@/lib/hooks/contact-group-hooks';
import { ContactRequestNotification } from './contact-request-notification';
import { ContactGroupHeader } from './contact-group-header';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WINDOW_EVENTS } from '@/lib/utils/constants';

interface GroupedContacts {
    online: Contact[];
    offline: Contact[];
    blocked: Contact[];
    custom: Map<string, Contact[]>;
}

export function ContactList() {
    const { pendingRequests } = usePendingContactRequests();
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const { data: acceptedContacts = [], isLoading: contactsLoading } = useContacts('accepted');
    const { data: customGroups = [], isLoading: groupsLoading, refetch: refetchGroups } = useContactGroups();
    const { data: groupMemberships, refetch: refetchMemberships } = useContactGroupMemberships();

    // Set up real-time updates
    useContactRealtimeUpdates();
    useContactGroupRealtimeUpdates();

    // Auto-expand Online group if user has no contacts or no online contacts
    const shouldAutoExpandOnline = acceptedContacts.length === 0 ||
        !acceptedContacts.some(contact =>
            contact.status === 'accepted' &&
            (contact.contactUser.presenceStatus === 'online' ||
                contact.contactUser.presenceStatus === 'away' ||
                contact.contactUser.presenceStatus === 'busy')
        );

    // Group contacts by status and custom groups
    const groupedContacts = useMemo(() => {
        const grouped: GroupedContacts = {
            online: [],
            offline: [],
            blocked: [],
            custom: new Map()
        };

        acceptedContacts.forEach((contact) => {
            if (contact.status === 'blocked') {
                grouped.blocked.push(contact);
            } else if (
                contact.contactUser.presenceStatus === 'online' ||
                contact.contactUser.presenceStatus === 'away' ||
                contact.contactUser.presenceStatus === 'busy'
            ) {
                grouped.online.push(contact);
            } else {
                grouped.offline.push(contact);
            }
        });

        // Group contacts by custom groups
        if (groupMemberships) {
            customGroups.forEach((group) => {
                const contactIds = groupMemberships.get(group.id) || [];
                const groupContacts = acceptedContacts.filter(
                    (contact) => contactIds.includes(contact.id)
                );
                grouped.custom.set(group.id, groupContacts);
            });
        }

        return grouped;
    }, [acceptedContacts, customGroups, groupMemberships])

    useEffect(() => {
        const appWindow = getCurrentWindow()

        const unsubscribeAddGroup = appWindow.listen(WINDOW_EVENTS.ADD_GROUP, () => {
            refetchGroups()
        })

        const unsubscribeUpdateGroups = appWindow.listen(WINDOW_EVENTS.UPDATE_GROUPS, () => {
            refetchGroups()
            refetchMemberships()
        })

        return () => {
            unsubscribeAddGroup.then(fn => fn()).catch(err => console.error(err))
            unsubscribeUpdateGroups.then(fn => fn()).catch(err => console.error(err))
        }
    }, [refetchGroups])

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

    const isGroupCollapsed = (groupId: string) => {
        // Auto-expand Online group if conditions are met
        if (groupId === 'online' && shouldAutoExpandOnline) {
            return false;
        }
        return collapsedGroups.has(groupId);
    };

    const renderContactItem = (contact: Contact) => {
        return (
            <ContactItem
                key={contact.id}
                contact={contact}
            />
        );
    };

    const renderGroupHeader = (title: string, count: number, groupId: string, isCustomGroup: boolean = false) => {
        const isCollapsed = isGroupCollapsed(groupId);

        return (
            <ContactGroupHeader
                groupId={groupId}
                title={title}
                count={count}
                isCollapsed={isCollapsed}
                onToggle={() => toggleGroup(groupId)}
                isCustomGroup={isCustomGroup}
            />
        );
    };

    const renderGroup = (
        title: string,
        groupContacts: Contact[],
        groupId: string,
        alwaysShow: boolean = false,
        placeholderText?: string,
        isCustomGroup: boolean = false
    ) => {
        if (groupContacts.length === 0 && !alwaysShow && !isCustomGroup) {
            return null;
        }

        const isCollapsed = isGroupCollapsed(groupId);

        return (
            <div key={groupId}>
                {renderGroupHeader(title, groupContacts.length, groupId, isCustomGroup)}
                {!isCollapsed && (
                    <div className="py-1">
                        {groupContacts.length > 0 ? (
                            groupContacts.map((contact) => renderContactItem(contact))
                        ) : placeholderText ? (
                            <div className="px-8">
                                <p
                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                    className="!text-lg text-gray-500"
                                >
                                    {placeholderText}
                                </p>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        );
    };

    const renderPendingInvites = () => {
        if (pendingRequests.length === 0) {
            return
        }

        const groupId = '_pending-invites'
        const isCollapsed = isGroupCollapsed(groupId);

        return (
            <div key={groupId} className="border-b border-gray-200">
                {renderGroupHeader('Pending Requests', pendingRequests.length, groupId)}
                {!isCollapsed && (
                    <div className="py-1">
                        {pendingRequests.map((request) => (
                            <ContactRequestNotification
                                key={request.id}
                                request={request}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (contactsLoading || groupsLoading) {
        return (
            <div className="flex-1 overflow-y-auto h-[calc(100vh-210px)] flex items-center justify-center">
                <div style={{ fontFamily: 'Pixelated MS Sans Serif' }} className="text-[11px] text-gray-600">
                    Loading contacts...
                </div>
            </div>
        );
    }

    // Determine placeholder text for Online group
    const onlinePlaceholderText = acceptedContacts.length === 0
        ? "Start adding contacts"
        : "All of your contacts are offline";

    return (
        <>
            <div className="flex-1 overflow-y-auto h-[calc(100vh-210px)] ml-[2px]">
                {/* Pending Contact Requests */}
                {renderPendingInvites()}

                {/* Online Contacts - Always show */}
                {renderGroup('Online', groupedContacts.online, 'online', true, onlinePlaceholderText)}

                {/* Custom Groups */}
                {customGroups.map((group) => {
                    const groupContacts = groupedContacts.custom.get(group.id) || [];
                    return renderGroup(group.name, groupContacts, group.id, false, undefined, true);
                })}

                {/* Offline Contacts - Always show */}
                {renderGroup('Offline', groupedContacts.offline, 'offline', true)}

                {/* Blocked Contacts */}
                {renderGroup('Blocked', groupedContacts.blocked, 'blocked')}
            </div>
        </>
    );
}
