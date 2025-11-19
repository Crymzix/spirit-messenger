import { TitleBar } from "../title-bar";
import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCreateContactGroup } from "@/lib/hooks/contact-group-hooks";
import { WINDOW_EVENTS } from "@/lib/utils/constants";

export function AddGroupWindow() {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const createGroupMutation = useCreateContactGroup();
    const [sectionIndex, setSectionIndex] = useState(0)
    const [groupName, setGroupName] = useState('');

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Enforce 50 character limit
        if (value.length <= 50) {
            setGroupName(value);
        }
    };

    const onAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);
        setSectionIndex(1)

        // Validate email format
        const trimmedName = groupName.trim();
        if (!trimmedName) {
            return;
        }

        if (trimmedName.length > 50) {
            return;
        }

        try {
            await createGroupMutation.mutateAsync({ name: trimmedName });

            const appWindow = getCurrentWindow()
            appWindow.emit(WINDOW_EVENTS.ADD_GROUP)

            setSuccessMessage('Group created successfully!');
        } catch (err) {
            console.error('Failed to send contact request:', err);
        }
    };

    const handleClose = () => {
        const appWindow = getCurrentWindow();
        appWindow.close()
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title="Create a New Group" />
            <div className="window-body flex-1 overflow-auto !my-[0px] !mx-[3px] flex">
                {/* Dialog Content */}
                <div className="p-4 flex flex-col gap-6 h-full flex-1">
                    <img src="/spirit-banner.png" className="h-22 ml-auto" />
                    {
                        sectionIndex === 0 ? (
                            <form className="flex flex-col flex-1">
                                <div className="mb-4 flex flex-col gap-4">
                                    <label htmlFor="contact-email" className="block text-[11px] font-bold text-black mb-2">
                                        Group Name
                                    </label>
                                    <input
                                        id="group-name"
                                        type="text"
                                        value={groupName}
                                        onChange={handleNameChange}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                onAddContact(e)
                                            }
                                        }}
                                        placeholder="Enter group name"
                                        autoFocus
                                        className="w-full px-3 py-2 text-[11px] border border-gray-400 rounded focus:outline-none focus:border-msn-blue"
                                        disabled={createGroupMutation.isPending}
                                    />
                                    <div className="flex items-center w-full">
                                        <div className="flex gap-4">
                                            <label className="self-start">
                                                Maximum 50 characters
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        ) : null
                    }
                    {
                        sectionIndex === 1 ? (
                            <form className="flex flex-col flex-1">
                                <div className="mb-4 flex flex-col gap-4">
                                    {/* Error Message  */}
                                    {createGroupMutation.error && (
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="font-bold"
                                        >
                                            We can't add {groupName} to your contact list. {createGroupMutation.error.message}.
                                        </div>
                                    )}
                                    {/* Success Message */}
                                    {successMessage && (
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="font-bold"
                                        >
                                            New group {groupName} added to your contact list.
                                        </div>
                                    )}
                                </div>
                            </form>
                        ) : null
                    }

                    {/* Dialog Actions */}
                    <div className="flex justify-end gap-2 mt-auto">
                        <button
                            className={sectionIndex === 0 ? 'opacity-50' : ''}
                            disabled={createGroupMutation.isPending || sectionIndex === 0}
                            onClick={() => {
                                setSectionIndex(0)
                            }}
                        >
                            Back
                        </button>
                        <button
                            onClick={sectionIndex === 1 ? handleClose : onAddContact}
                            className={!groupName?.trim() ? 'opacity-50' : ''}
                            disabled={!groupName?.trim() || createGroupMutation.isPending}
                        >
                            {createGroupMutation.isPending ? 'Loading...' : sectionIndex === 1 ? 'Finish' : 'Next'}
                        </button>
                        <button
                            className="ml-4"
                            onClick={handleClose}
                            disabled={createGroupMutation.isPending}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}