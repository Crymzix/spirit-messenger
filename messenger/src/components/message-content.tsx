import { useMemo } from 'react';
import { findEmoticonMatches } from '@/lib/emoticons';
import { CallType, User } from '@/types';
import { IncomingCallMessage } from './incoming-call-message';
import { useUser } from '@/lib';

interface MessageContentProps {
    content: string;
    messageType?: 'text' | 'file' | 'system' | 'image' | 'voice' | 'wink';
    metadata?: {
        emoticons?: Array<{ position: number; code: string }>;
        formatting?: { bold?: boolean; italic?: boolean; color?: string };
        // Call metadata for system messages
        callId?: string;
        callType?: CallType;
        durationSeconds?: number;
        status?: 'completed' | 'declined' | 'missed' | 'ringing' | 'active';
    };
    caller?: User;
    conversationId?: string;
    initiatorId?: string;
}

/**
 * Component to render message content with emoticons converted to images and text formatting
 * Also handles system messages for call history
 */
export function MessageContent({ content, messageType, metadata, caller, conversationId, initiatorId }: MessageContentProps) {
    // Check if this is a call system message
    const isCallMessage = messageType === 'system' && metadata?.callId && metadata?.callType;

    // Get current user for determining message visibility
    const currentUser = useUser();

    // Render call history message
    const callHistoryContent = useMemo(() => {
        if (!isCallMessage) return null;

        const { callId, callType, status, durationSeconds } = metadata!;

        // Handle ringing status with interactive buttons
        if (caller && conversationId && callId && initiatorId && (status === 'ringing' || status === 'active')) {
            return (
                <IncomingCallMessage
                    callId={callId}
                    callType={callType!}
                    caller={caller}
                    conversationId={conversationId}
                    initiatorId={initiatorId}
                    callStatus={status as 'ringing' | 'active' | 'declined' | 'missed' | 'ended'}
                />
            );
        }

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
                statusClass = 'text-blue-700';
                statusText = `${callType === 'voice' ? 'Voice' : 'Video'} call${durationText}`;
                break;
            case 'declined':
                statusClass = 'text-red-600';
                // Show different message based on user's role in the call
                const isReceiver = currentUser?.id !== initiatorId;
                if (isReceiver) {
                    // Receiver sees who declined (the initiator)
                    statusText = `Declined ${callType === 'voice' ? 'voice' : 'video'} call from ${caller?.displayName || 'unknown'}`;
                } else {
                    // Initiator just sees that the call was declined
                    statusText = `${callType === 'voice' ? 'Voice' : 'Video'} call declined`;
                }
                break;
            case 'missed':
                statusClass = 'text-red-600';
                statusText = `Missed ${callType === 'voice' ? 'voice' : 'video'} call from ${caller?.displayName || 'unknown'}`;
                break;
            case 'active':
                statusClass = 'text-blue-600';
                statusText = `${callType === 'voice' ? 'Voice' : 'Video'} call in progress...`;
                break;
            default:
                statusClass = 'text-gray-600';
                statusText = content;
        }

        return (
            <div
                className={`flex flex-col gap-2 italic ${statusClass}`}
            >
                <div className='h-[1px] bg-gray-400 w-16'></div>
                <span>{statusText}</span>
            </div >
        );
    }, [isCallMessage, metadata, content, caller, conversationId, initiatorId, currentUser?.id]);

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
