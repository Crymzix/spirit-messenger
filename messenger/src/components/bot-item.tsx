import { Bot, PresenceStatus } from '@/types';
import { invoke } from '@tauri-apps/api/core';
import AIAvatar from './ai-avatar';

interface BotItemProps {
    bot: Bot;
    hasUnread?: boolean;
}

export function BotItem({ bot, hasUnread }: BotItemProps) {
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

    const handleDoubleClick = async () => {
        await invoke("open_chat_window", {
            dialogWindow: bot.id,
            contactName: bot.displayName || bot.username,
        });
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            className={`flex items-center gap-2 px-2 py-1.5 hover:bg-msn-light-blue cursor-pointer transition-colors ${hasUnread ? 'bg-blue-50' : ''
                }`}
        >
            {/* Display Picture */}
            <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                    {bot.displayPictureUrl ? (
                        <AIAvatar name={bot.displayName || bot.username} colors={["#0481f6", "#4edfb3", "#ff005b", "#ff7d10", "#ffb238"]} className='absolute size-8' />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-bold">
                            {(bot.displayName || bot.username).charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                {/* Presence Status Indicator */}
                <div
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${getPresenceColor(
                        bot.presenceStatus
                    )}`}
                    title={bot.presenceStatus}
                />
            </div>

            {/* Bot Info */}
            <div className="flex-1 min-w-0">
                {/* Display Name */}
                <div className={`text-[11px] text-black truncate font-verdana ${hasUnread ? 'font-bold' : 'font-medium'
                    }`}>
                    {bot.displayName || bot.username}
                </div>
                {/* Personal Message */}
                {bot.personalMessage && (
                    <div className="text-[9px] text-gray-600 truncate">
                        {bot.personalMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
