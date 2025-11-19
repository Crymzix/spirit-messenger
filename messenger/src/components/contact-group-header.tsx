/**
 * Contact Group Header Component
 * Collapsible header for contact groups with right-click context menu
 * 
 * Features:
 * - Collapsible/expandable group header
 * - Right-click context menu for Rename and Delete
 * - Classic MSN Messenger styling
 */

import { useState, useRef, useEffect } from 'react';
import { useUpdateContactGroup, useDeleteContactGroup } from '@/lib/hooks/contact-group-hooks';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createWindow } from '@/lib/utils/window-utils';

interface ContactGroupHeaderProps {
    groupId: string;
    title: string;
    count: number;
    isCollapsed: boolean;
    onToggle: () => void;
    isCustomGroup?: boolean;
}

export function ContactGroupHeader({
    groupId,
    title,
    count,
    isCollapsed,
    onToggle,
    isCustomGroup = false,
}: ContactGroupHeaderProps) {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(title);
    const [, setRenameError] = useState('');

    const contextMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const updateGroup = useUpdateContactGroup();
    const deleteGroup = useDeleteContactGroup();

    const handleContextMenu = (e: React.MouseEvent) => {
        // Only show context menu for custom groups
        if (!isCustomGroup) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setShowContextMenu(false);
            }
        };

        if (showContextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showContextMenu]);

    // Focus input when renaming starts
    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleRename = () => {
        setShowContextMenu(false);
        setIsRenaming(true);
        setNewName(title);
        setRenameError('');
    };

    const handleDelete = async () => {
        setShowContextMenu(false);

        // Confirm deletion
        const description = `Are you sure you want to delete the group "${title}"?\n\nContacts in this group will not be removed.`

        const eventName = 'delete-group'
        const path = `/alert-dialog.html?title=${encodeURI("Delete Group")}&description=${encodeURI(description)}&event=${eventName}`;

        createWindow('alert-dialog', path, {
            title: 'Delete Group',
            width: 320,
            height: 140,
            resizable: true,
            decorations: false,
            transparent: true,
            center: true,
        });

        const appWindow = getCurrentWindow()
        appWindow.listen(eventName, async () => {
            await deleteGroup.mutateAsync(groupId);
        });
    };

    const handleRenameSubmit = async () => {
        const trimmedName = newName.trim();

        // Validate
        if (!trimmedName) {
            setRenameError('Group name cannot be empty');
            return;
        }

        if (trimmedName.length > 50) {
            setRenameError('Group name must be 50 characters or less');
            return;
        }

        if (trimmedName === title) {
            // No change, just cancel
            setIsRenaming(false);
            return;
        }

        try {
            await updateGroup.mutateAsync({
                groupId,
                data: { name: trimmedName },
            });
            setIsRenaming(false);
            setRenameError('');
        } catch (err) {
            setRenameError(err instanceof Error ? err.message : 'Failed to rename group');
        }
    };

    const handleRenameCancel = () => {
        setIsRenaming(false);
        setNewName(title);
        setRenameError('');
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            handleRenameCancel();
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Enforce 50 character limit
        if (value.length <= 50) {
            setNewName(value);
            setRenameError('');
        }
    };

    return (
        <>
            <div
                onClick={onToggle}
                onContextMenu={handleContextMenu}
                className="flex items-center gap-1 px-1 py-1 cursor-pointer transition-colors hover:bg-gray-100"
            >
                <span className="text-[10px] text-gray-700">
                    {isCollapsed ? (
                        <img src="/group-plus.png" className="size-10" />
                    ) : (
                        <img src="/group-minus.png" className="size-10" />
                    )}
                </span>

                {isRenaming ? (
                    <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newName}
                            onChange={handleNameChange}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={handleRenameSubmit}
                            className="flex-1 !text-lg font-bold text-[#00005D]"
                            style={{
                                fontFamily: 'Pixelated MS Sans Serif',
                            }}
                        />
                    </div>
                ) : (
                    <span
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        className="!text-lg font-bold text-[#00005D]"
                    >
                        {title} ({count})
                    </span>
                )}
            </div>

            {/* Context Menu */}
            {showContextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed bg-white border border-gray-400 shadow-lg z-50 min-w-[150px]"
                    style={{
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`,
                    }}
                >
                    <div
                        onClick={handleRename}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                        <div className='w-4' />
                        <span
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        >
                            Rename
                        </span>
                    </div>
                    <div
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                        <div className='w-4' />
                        <span
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        >
                            Delete
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
