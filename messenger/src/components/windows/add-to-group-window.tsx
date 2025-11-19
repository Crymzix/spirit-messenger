import { TitleBar } from "../title-bar";
import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ContactGroup } from '@/types';
import { useContactGroups, useContactGroupMemberships, useBulkUpdateContactGroupMemberships } from '@/lib/hooks/contact-group-hooks';
import { WINDOW_EVENTS } from "@/lib/utils/constants";

export function AddToGroupWindow() {
    const [sectionIndex, setSectionIndex] = useState(0);
    const [contactId, setContactId] = useState<string>('');
    const [contactName, setContactName] = useState<string>('');

    const { data: customGroups = [], isLoading: isLoadingContactGroups } = useContactGroups();
    const { data: groupMemberships } = useContactGroupMemberships();
    const bulkUpdateMutation = useBulkUpdateContactGroupMemberships();

    // Track which groups the contact is currently in
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

    // Extract contact info from URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('contactId');
        const name = params.get('contactName');

        if (id) setContactId(id);
        if (name) setContactName(name);
    }, []);

    // Initialize selected groups based on current memberships
    useEffect(() => {
        if (groupMemberships && contactId) {
            const contactGroups = new Set<string>();
            groupMemberships.forEach((contactIds, groupId) => {
                if (contactIds.includes(contactId)) {
                    contactGroups.add(groupId);
                }
            });
            setSelectedGroups(contactGroups);
        }
    }, [groupMemberships, contactId]);

    const handleToggleGroup = (group: ContactGroup) => {
        // Just update local state, don't make API call yet
        setSelectedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group.id)) {
                next.delete(group.id);
            } else {
                next.add(group.id);
            }
            return next;
        });
    };

    const handleNext = async () => {
        try {
            await bulkUpdateMutation.mutateAsync({
                contactId,
                groupIds: Array.from(selectedGroups),
            });

            const appWindow = getCurrentWindow()
            appWindow.emit(WINDOW_EVENTS.UPDATE_GROUPS)

            setSectionIndex(1)
        } catch (error) {
            console.error('Failed to update group memberships:', error);
        }
    };

    const handleClose = () => {
        const appWindow = getCurrentWindow();
        appWindow.close();
    };

    const isLoading = bulkUpdateMutation.isPending;

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title="Add to Group" />
            <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px] flex">
                {/* Dialog Content */}
                <div className="p-4 flex flex-col gap-6 h-full flex-1">
                    <img src="/spirit-banner.png" className="h-22 ml-auto" />
                    {
                        sectionIndex === 0 ? (
                            <div className="flex flex-col flex-1">
                                <div className="mb-4 flex flex-col gap-4">
                                    <label className="block text-[11px] font-bold text-black mb-2">
                                        Select groups for <span className="font-bold">{contactName}</span>:
                                    </label>

                                    {/* Groups List */}
                                    <div className="bg-white border border-gray-400 max-h-[250px] overflow-y-auto">
                                        {isLoadingContactGroups ? (
                                            <div className="p-3 text-center">
                                                <p
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                    className="text-[11px] text-gray-600"
                                                >
                                                    Loading groups...
                                                </p>
                                            </div>
                                        ) : customGroups.length === 0 ? (
                                            <div className="p-3 text-center">
                                                <p
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                    className="text-[11px] text-gray-600"
                                                >
                                                    No custom groups available.
                                                    <br />
                                                    Create a group first.
                                                </p>
                                            </div>
                                        ) : (
                                            customGroups.map((group) => {
                                                const isSelected = selectedGroups.has(group.id);

                                                return (
                                                    <div
                                                        key={group.id}
                                                        onClick={() => handleToggleGroup(group)}
                                                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-msn-light-blue transition-colors border-b border-gray-200 last:border-b-0"
                                                    >
                                                        {/* Checkbox */}
                                                        <div
                                                            className={`w-4 h-4 border-2 border-gray-600 flex items-center justify-center ${isSelected ? 'bg-msn-blue' : 'bg-white'
                                                                }`}
                                                        >
                                                            {isSelected && (
                                                                <span className="text-white text-[10px] font-bold">✓</span>
                                                            )}
                                                        </div>

                                                        {/* Group Name */}
                                                        <span
                                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                            className="text-[11px] text-gray-800"
                                                        >
                                                            {group.name}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null
                    }
                    {
                        sectionIndex === 1 ? (
                            <div className="flex flex-col flex-1">
                                <div className="mb-4 flex flex-col gap-4">
                                    {/* Error Message */}
                                    {bulkUpdateMutation.error && (
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="font-bold text-red-600"
                                        >
                                            Failed to update groups: {bulkUpdateMutation.error.message}
                                        </div>
                                    )}
                                    {/* Success Message */}
                                    {!bulkUpdateMutation.error && (
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="font-bold"
                                        >
                                            Groups updated for {contactName}.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null
                    }

                    {/* Dialog Actions */}
                    <div className="flex justify-end gap-2 mt-auto">
                        <button
                            className={sectionIndex === 0 ? 'opacity-50' : ''}
                            disabled={isLoading || sectionIndex === 0}
                            onClick={() => {
                                setSectionIndex(0)
                            }}
                        >
                            Back
                        </button>
                        <button
                            onClick={sectionIndex === 1 ? handleClose : handleNext}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : sectionIndex === 1 ? 'Finish' : 'Next'}
                        </button>
                        <button
                            className="ml-4"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}