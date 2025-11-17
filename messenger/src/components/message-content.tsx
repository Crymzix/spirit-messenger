import { useMemo } from 'react';
import { findEmoticonMatches } from '@/lib/emoticons';

interface MessageContentProps {
    content: string;
    metadata?: {
        emoticons?: Array<{ position: number; code: string }>;
        formatting?: { bold?: boolean; italic?: boolean; color?: string };
    };
}

/**
 * Component to render message content with emoticons converted to images and text formatting
 */
export function MessageContent({ content, metadata }: MessageContentProps) {
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
