import { Bot, PresenceStatus } from '@/types';
import { invoke } from '@tauri-apps/api/core';
import Avatar from 'boring-avatars';

interface BotItemProps {
    bot: Bot;
}

export function BotItem({ bot }: BotItemProps) {
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
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-msn-light-blue cursor-pointer transition-colors"
        >
            {/* Display Picture */}
            <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                    {bot.displayPictureUrl ? (
                        <Avatar name={bot.displayName || bot.username} colors={["#0481f6", "#4edfb3", "#ff005b", "#ff7d10", "#ffb238"]} variant="marble" className='size-8' />
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
                <div className="text-[11px] font-bold text-black truncate">
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
