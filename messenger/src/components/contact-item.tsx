import { useState, useRef, useEffect } from 'react';
import { Contact, PresenceStatus } from '@/types';
import { invoke } from '@tauri-apps/api/core';
import { createWindow } from '@/lib/utils/window-utils';

interface ContactItemProps {
    contact: Contact;
    onClick?: (contact: Contact) => void;
    onAddToGroup?: (contact: Contact) => void;
}

export function ContactItem({ contact, onClick, onAddToGroup }: ContactItemProps) {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const { contactUser } = contact;

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

    const getPresenceColor = (status: PresenceStatus): string => {
        switch (status) {
            case 'online':
                return 'bg-msn-online';
            case 'away':
                return 'bg-msn-away';
            case 'busy':
                return 'bg-msn-busy';
            case 'appear_offline':
            case 'offline':
            default:
                return 'bg-gray-400';
        }
    };

    const handleClick = () => {
        onClick?.(contact);
    };

    const handleDoubleClick = async () => {
        await invoke("open_chat_window", {
            dialogWindow: contact.id, // TODO: Handle group chats
            options: {},
        });
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setShowContextMenu(true);
    };

    const handleAddToGroup = () => {
        setShowContextMenu(false);
        onAddToGroup?.(contact);
    };

    const handleRemoveContact = () => {
        setShowContextMenu(false);

        const path = `/remove-contact.html?contactId=${contactUser.id}&contactName=${contactUser.displayName || contactUser.username}`;

        createWindow('remove-contact', path, {
            title: 'Remove Contact',
            width: 320,
            height: 140,
            resizable: true,
            decorations: false,
            transparent: true,
            center: true,
        });
    };

    return (
        <>
            <div
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-msn-light-blue cursor-pointer transition-colors"
            >
                {/* Display Picture - 96x96px as per requirements, but scaled down for list view */}
                <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                        {contactUser.displayPictureUrl ? (
                            <img
                                src={contactUser.displayPictureUrl}
                                alt={contactUser.displayName || contactUser.username}
                                className="w-full h-full object-cover"
                                style={{ maxWidth: '96px', maxHeight: '96px' }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-bold">
                                {(contactUser.displayName || contactUser.username).charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    {/* Presence Status Indicator - colored dot */}
                    <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${getPresenceColor(
                            contactUser.presenceStatus
                        )}`}
                        title={contactUser.presenceStatus}
                    />
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0">
                    {/* Display Name */}
                    <div className="text-[11px] font-bold text-black truncate">
                        {contactUser.displayName || contactUser.username}
                    </div>
                    {/* Personal Message */}
                    {contactUser.personalMessage && (
                        <div className="text-[9px] text-gray-600 truncate">
                            {contactUser.personalMessage}
                        </div>
                    )}
                </div>
            </div>

            {/* Right-click Context Menu */}
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
                        onClick={handleAddToGroup}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                        <div className='w-4' />
                        <span
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        >
                            Add to Group
                        </span>
                    </div>
                    <div className="border-t border-gray-300" />
                    <div
                        onClick={handleRemoveContact}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                        <div className='w-4' />
                        <span
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        >
                            Remove Contact
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
