import { useMemo } from 'react';
import { findEmoticonMatches } from '@/lib/emoticons';
import { CallType } from '@/types';

interface MessageContentProps {
    content: string;
    messageType?: 'text' | 'file' | 'system' | 'image' | 'voice';
    metadata?: {
        emoticons?: Array<{ position: number; code: string }>;
        formatting?: { bold?: boolean; italic?: boolean; color?: string };
        // Call metadata for system messages
        callId?: string;
        callType?: CallType;
        durationSeconds?: number;
        status?: 'completed' | 'declined' | 'missed';
    };
}

/**
 * Component to render message content with emoticons converted to images and text formatting
 * Also handles system messages for call history
 */
export function MessageContent({ content, messageType, metadata }: MessageContentProps) {
    // Check if this is a call system message
    const isCallMessage = messageType === 'system' && metadata?.callId && metadata?.callType;
    // Render call history message
    const callHistoryContent = useMemo(() => {
        if (!isCallMessage) return null;

        const { callType, status, durationSeconds } = metadata!;

        // Determine icon based on call type
        const callIcon = callType === 'voice' ? '📞' : '📹';

        // Format duration if available
        let durationText = '';
        if (status === 'completed' && durationSeconds !== undefined) {
            const minutes = Math.floor(durationSeconds / 60);
            const seconds = durationSeconds % 60;
            durationText = ` - ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Determine status styling and text
        let statusClass = '';
        let statusText = '';

        switch (status) {
            case 'completed':
                statusClass = 'text-green-700';
                statusText = `${callType === 'voice' ? 'Voice' : 'Video'} call${durationText}`;
                break;
            case 'declined':
                statusClass = 'text-red-600';
                statusText = `${callType === 'voice' ? 'Voice' : 'Video'} call declined`;
                break;
            case 'missed':
                statusClass = 'text-orange-600';
                statusText = `Missed ${callType === 'voice' ? 'voice' : 'video'} call`;
                break;
            default:
                statusClass = 'text-gray-600';
                statusText = content;
        }

        return (
            <div className={`flex items-center gap-2 italic ${statusClass}`}>
                <span className="text-xl">{callIcon}</span>
                <span>{statusText}</span>
            </div>
        );
    }, [isCallMessage, metadata, content]);

    const renderedContent = useMemo(() => {
        // Find all emoticon matches in the content
        const matches = findEmoticonMatches(content);

        if (matches.length === 0) {
            return content;
        }

        // Build an array of text segments and emoticon elements
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        matches.forEach((match, idx) => {
            // Add text before this emoticon
            if (match.startIndex > lastIndex) {
                const textSegment = content.substring(lastIndex, match.startIndex);
                elements.push(
                    <span key={`text-${idx}`}>{textSegment}</span>
                );
            }

            // Add the emoticon image
            elements.push(
                <img
                    key={`emoticon-${idx}`}
                    src={match.emoticon.imageUrl}
                    alt={match.emoticon.name}
                    title={match.shortcut}
                    className="inline-block w-5 h-5 align-middle mx-0.5"
                />
            );

            lastIndex = match.endIndex;
        });

        // Add any remaining text after the last emoticon
        if (lastIndex < content.length) {
            const textSegment = content.substring(lastIndex);
            elements.push(
                <span key={`text-end`}>{textSegment}</span>
            );
        }

        return <>{elements}</>;
    }, [content]);

    // If this is a call message, render the call history content
    if (isCallMessage) {
        return callHistoryContent;
    }

    // Apply formatting if present
    const style: React.CSSProperties = {
        fontFamily: 'Pixelated MS Sans Serif'
    };
    if (metadata?.formatting?.color) {
        style.color = metadata.formatting.color;
    }

    const className = [
        metadata?.formatting?.bold ? 'font-bold' : '',
        metadata?.formatting?.italic ? 'italic' : '',
    ].filter(Boolean).join(' ');

    return (
        <span className={`!font-verdana ${className}`} style={style}>
            {renderedContent}
        </span>
    );
}
