interface TypingIndicatorProps {
    usernames: string[];
}

export function TypingIndicator({ usernames }: TypingIndicatorProps) {
    if (usernames.length === 0) {
        return null;
    }

    const getTypingText = () => {
        if (usernames.length === 1) {
            return `${usernames[0]} is typing...`;
        } else if (usernames.length === 2) {
            return `${usernames[0]} and ${usernames[1]} are typing...`;
        } else {
            return 'Multiple people are typing...';
        }
    };

    return (
        <div className="typing-indicator flex items-center px-3 py-2 text-[10px] text-gray-600 italic">
            <div className="typing-dots flex gap-1 mr-2">
                <span className="dot w-1 h-1 bg-gray-600 rounded-full animate-typing-pulse"></span>
                <span className="dot w-1 h-1 bg-gray-600 rounded-full animate-typing-pulse [animation-delay:0.2s]"></span>
                <span className="dot w-1 h-1 bg-gray-600 rounded-full animate-typing-pulse [animation-delay:0.4s]"></span>
            </div>
            <span className="typing-text">{getTypingText()}</span>
        </div>
    );
}
