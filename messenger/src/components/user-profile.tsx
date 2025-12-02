import { useState, useEffect, useRef } from 'react';
import { useUser } from '../lib/store/auth-store';
import { useSetPresenceStatus } from '../lib/hooks/presence-hooks';
import { createWindow } from '@/lib/utils/window-utils';
import { PresenceStatus } from '@/types';

interface UserProfileProps {
    presenceStatus: PresenceStatus;
    onStatusChange: (status: PresenceStatus) => void;
}

const statusOptions: { value: PresenceStatus; label: string; color: string }[] = [
    { value: 'online', label: 'Online', color: 'bg-msn-online' },
    { value: 'away', label: 'Away', color: 'bg-msn-away' },
    { value: 'be_right_back', label: 'Be Right Back', color: 'bg-msn-away' },
    { value: 'on_the_phone', label: 'On The Phone', color: 'bg-msn-away' },
    { value: 'out_to_lunch', label: 'Out To Lunch', color: 'bg-msn-away' },
    { value: 'busy', label: 'Busy', color: 'bg-msn-busy' },
    { value: 'appear_offline', label: 'Appear Offline', color: 'bg-gray-400' },
];

export function UserProfile({ presenceStatus, onStatusChange }: UserProfileProps) {
    const user = useUser();
    const setPresenceStatus = useSetPresenceStatus();
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentStatus = statusOptions.find(s => s.value === presenceStatus) || statusOptions[3];

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        }

        if (isStatusDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isStatusDropdownOpen]);

    const handleStatusChange = async (status: PresenceStatus) => {
        try {
            // Update presence status via the hook
            await setPresenceStatus.mutateAsync(status);
            // Update local UI state
            onStatusChange(status);
            setIsStatusDropdownOpen(false);
        } catch (error) {
            console.error('Failed to update presence status:', error);
            // Still update the UI even if the backend call fails
            onStatusChange(status);
            setIsStatusDropdownOpen(false);
        }
    };

    const handleProfilePictureEdit = () => {
        setIsStatusDropdownOpen(false);

        createWindow('profile-picture-upload', '/profile-picture-upload.html', {
            title: 'My Display Picture',
            width: 400,
            height: 500,
            resizable: false,
            decorations: false,
            transparent: true,
            center: true,
        });
    }

    const handleOptions = () => {
        setIsStatusDropdownOpen(false);
        const path = `/options.html?option=profile`
        createWindow('options', path, {
            title: 'Options',
            width: 480,
            height: 600,
            resizable: false,
            decorations: false,
            transparent: true,
            center: true,
        });
    }

    return (
        <div className="bg-gradient-to-t from-[#E4EFFE] relative mt-4">
            <div className='bg-gradient-to-b from-[#FEFEFE] h-12 w-full absolute z-20 top-0'>
            </div>
            <div className="flex flex-col gap-2 border-l border-r border-b border-[#8D9BB5] mx-[1px] mb-[1px] rounded-b-sm">
                <div className='flex z-30'>
                    {/* Display Picture */}
                    <div className="relative -mb-8 mx-3">
                        <div className="size-24 rounded-lg border border-[#78859E] overflow-hidden">
                            {user?.displayPictureUrl ? (
                                <img
                                    src={user.displayPictureUrl}
                                    alt={user.displayName || user.username}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src="/default-profile-pictures/friendly_dog.png"
                                    alt="default"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <div
                            className="absolute bg-gradient-to-b from-[#96AEC0] top-24 h-3 w-24"
                            style={{
                                left: '50%',
                                transform: 'translateX(-50%)',
                                clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
                                filter: 'blur(1px)',
                                zIndex: 0
                            }}
                        />
                    </div>
                    <div className='flex flex-col'>
                        {/* Display Name */}
                        <div className='flex gap-1 items-center'>
                            <div
                                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                className="font-bold text-lg truncate text-gray-900"
                            >
                                {user?.displayName || user?.username || 'User'}
                            </div>
                            {/* Status Selector Dropdown */}
                            <div ref={dropdownRef} className="relative">
                                <div
                                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                    className="flex items-center gap-1 px-2 py-0.5 transition-colors cursor-pointer"
                                >
                                    <span className={`w-2 h-2 rounded-full ${currentStatus.color}`}></span>
                                    <span
                                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                    >
                                        ({currentStatus.label})
                                    </span>
                                    <svg
                                        className="pointer-events-none"
                                        width="8"
                                        height="5"
                                        viewBox="0 0 8 5"
                                        fill="none"
                                    >
                                        <path d="M0 0L4 5L8 0H0Z" fill="#24245D" />
                                    </svg>
                                </div>

                                {/* Dropdown Menu */}
                                {isStatusDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-400 shadow-lg min-w-72 z-50">
                                        {statusOptions.map((option) => (
                                            <div
                                                key={option.value}
                                                onClick={() => handleStatusChange(option.value)}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left"
                                            >
                                                <div className='w-4 flex items-center'>
                                                    <span className={`w-2 h-2 rounded-full ${option.color}`}></span>
                                                </div>
                                                <span
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    {option.label}
                                                </span>
                                            </div>
                                        ))}
                                        <div className='h-[1px] w-full bg-gray-400'></div>
                                        <div
                                            key="display-picture"
                                            onClick={handleProfilePictureEdit}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left whitespace-nowrap"
                                        >
                                            <div className='w-4' />
                                            <span
                                                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            >
                                                Change display picture...
                                            </span>
                                        </div>
                                        <div
                                            key="display-name"
                                            onClick={handleOptions}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left whitespace-nowrap"
                                        >
                                            <div className='w-4' />
                                            <span
                                                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            >
                                                Change display name...
                                            </span>
                                        </div>
                                        <div className='h-[1px] w-full bg-gray-400'></div>
                                        <div
                                            key="options"
                                            onClick={handleOptions}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-md hover:bg-msn-light-blue transition-colors text-left whitespace-nowrap"
                                        >
                                            <div className='w-4' />
                                            <span
                                                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            >
                                                Options
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Personal Message */}
                        <div
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                            className="!text-md text-gray-600 truncate mt-4"
                        >
                            {user?.personalMessage || '<Type a personal message>'}
                        </div>
                    </div>
                </div>
                <div className='flex items-center gap-6 bg-gradient-to-b from-[#C2D2E3]/40 rounded-t-xl mx-[2px] mb-[1px] h-10 pl-30'>
                    <div className='flex items-center gap-1 cursor-pointer'>
                        <img src='/msn-mail.png' className='size-8 cursor-pointer' />
                        <label className='text-[#020720] tracking-wide cursor-pointer'>E-mail</label>
                    </div>
                    <div className='flex items-center gap-1 cursor-pointer'>
                        <img src='/butterfly.png' className='size-8 cursor-pointer' />
                        <label className='text-[#020720] tracking-wide cursor-pointer'>Spirit Today</label>
                    </div>
                </div>
            </div>
        </div>
    );
}
