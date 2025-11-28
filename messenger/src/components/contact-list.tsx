import { useEffect, useState, useMemo } from 'react';
import { Contact } from '@/types';
import { ContactItem } from './contact-item';
import { BotItem } from './bot-item';
import { usePendingContactRequests, useContactRealtimeUpdates, useContacts } from '@/lib/hooks/contact-hooks';
import { useContactGroups, useContactGroupMemberships, useContactGroupRealtimeUpdates, useReorderContactGroups } from '@/lib/hooks/contact-group-hooks';
import { useBots } from '@/lib/hooks/bot-hooks';
import { useUnreadCounts } from '@/lib/hooks/message-hooks';
import { ContactRequestNotification } from './contact-request-notification';
import { ContactGroupHeader } from './contact-group-header';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { WINDOW_EVENTS } from '@/lib/utils/constants';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableGroupItem } from './sortable-group-item';
import { NewsBanner } from './news-banner';

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
    const { data: blockedContacts = [], isLoading: blockedContactsLoading } = useContacts('blocked');
    const { data: customGroups = [], isLoading: groupsLoading, refetch: refetchGroups } = useContactGroups();
    const { data: groupMemberships, refetch: refetchMemberships } = useContactGroupMemberships();
    const { data: bots = [], isLoading: botsLoading } = useBots();
    const reorderGroups = useReorderContactGroups();

    // Unread message tracking (returns map of userId -> unread count)
    const { data: unreadCounts = {} } = useUnreadCounts();

    // Set up real-time updates
    useContactRealtimeUpdates();
    useContactGroupRealtimeUpdates();

    // Set up drag-and-drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
            blocked: blockedContacts,
            custom: new Map()
        };

        acceptedContacts.forEach((contact) => {
            if (
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
    }, [acceptedContacts, blockedContacts, customGroups, groupMemberships])

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

    useEffect(() => {
        // Listen for notification clicks to open chat windows
        const unsubscribe = listen<{ senderId: string }>('chat-notification-clicked', async (event) => {
            const { senderId } = event.payload;

            // Find the contact to get their display name
            const contact = acceptedContacts?.find(c => c.contactUser?.id === senderId);
            let senderName = ''
            if (contact) {
                senderName = contact?.contactUser?.displayName || contact?.contactUser?.email
            } else {
                // Retrieve from cached bots
                const bot = bots?.find(b => b.id === senderId);
                senderName = bot?.displayName || bot?.email || ''
            }

            // Open chat window with the sender
            await invoke('open_chat_window', {
                dialogWindow: senderId,
                contactName: senderName,
            });
        });

        return () => {
            unsubscribe.then(fn => fn()).catch(err => console.error(err));
        };
    }, [acceptedContacts, bots])

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

    // Handle drag end for group reordering
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = customGroups.findIndex((group) => group.id === active.id);
        const newIndex = customGroups.findIndex((group) => group.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        // Reorder the groups array
        const reorderedGroups = arrayMove(customGroups, oldIndex, newIndex);

        // Create the new display orders
        const groupOrders = reorderedGroups.map((group, index) => ({
            groupId: group.id,
            displayOrder: index,
        }));

        // Send reorder request to backend with optimistic update
        reorderGroups.mutate(groupOrders);
    };

    const isGroupCollapsed = (groupId: string) => {
        // Auto-expand Online group if conditions are met
        if (groupId === 'online' && shouldAutoExpandOnline) {
            return false;
        }
        return collapsedGroups.has(groupId);
    };

    const renderContactItem = (contact: Contact) => {
        // Check if this contact has unread messages (unreadCounts is keyed by userId)
        const hasUnread = (unreadCounts[contact.contactUser.id] ?? 0) > 0;

        return (
            <ContactItem
                key={contact.id}
                contact={contact}
                hasUnread={hasUnread}
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

    if (contactsLoading || blockedContactsLoading || groupsLoading || botsLoading) {
        return (
            <div className="flex-1 overflow-y-auto h-[calc(100vh-282px)] flex items-center justify-center">
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
        <div>
            <div className="flex-1 overflow-y-auto h-[calc(100vh-282px)] ml-[2px]">
                {/* Pending Contact Requests */}
                {renderPendingInvites()}

                {/* Online Contacts - Always show */}
                {renderGroup('Online', groupedContacts.online, 'online', true, onlinePlaceholderText)}

                {/* AI Bots */}
                {bots.length > 0 && (
                    <div key="bots">
                        {renderGroupHeader('Spirits', bots.length, 'bots')}
                        {!isGroupCollapsed('bots') && (
                            <div className="py-1">
                                {bots.map((bot) => {
                                    const hasUnread = (unreadCounts[bot.id] ?? 0) > 0;

                                    return (
                                        <BotItem
                                            key={bot.id}
                                            bot={bot}
                                            hasUnread={hasUnread}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Custom Groups with Drag-and-Drop */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={customGroups.map((group) => group.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {customGroups.map((group) => {
                            const groupContacts = groupedContacts.custom.get(group.id) || [];
                            const isCollapsed = isGroupCollapsed(group.id);

                            return (
                                <SortableGroupItem
                                    key={group.id}
                                    id={group.id}
                                    groupId={group.id}
                                    title={group.name}
                                    count={groupContacts.length}
                                    isCollapsed={isCollapsed}
                                    onToggle={() => toggleGroup(group.id)}
                                    isCustomGroup={true}
                                >
                                    {!isCollapsed && (
                                        <div className="py-1">
                                            {groupContacts.length > 0 ? (
                                                groupContacts.map((contact) => renderContactItem(contact))
                                            ) : null}
                                        </div>
                                    )}
                                </SortableGroupItem>
                            );
                        })}
                    </SortableContext>
                </DndContext>

                {/* Offline Contacts - Always show */}
                {renderGroup('Offline', groupedContacts.offline, 'offline', true)}

                {/* Blocked Contacts */}
                {renderGroup('Blocked', groupedContacts.blocked, 'blocked')}
            </div>
            <NewsBanner />
        </div>
    );
}
