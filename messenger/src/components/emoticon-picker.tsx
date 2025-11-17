import { useEffect, useRef } from 'react';
import { emoticons, Emoticon } from '@/lib/emoticons';

interface EmoticonPickerProps {
    onSelect: (emoticon: Emoticon) => void;
    onClose?: () => void;
}

export function EmoticonPicker({ onSelect, onClose }: EmoticonPickerProps) {
    const pickerRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleEmoticonSelect = (emoticon: Emoticon) => {
        onSelect(emoticon);
    };

    return (
        <div
            ref={pickerRef}
            className="absolute bottom-8 z-50 bg-white border-[1px] border-[#31497C]"
            style={{
                width: '320px',
                maxHeight: '400px',
            }}
        >
            {/* Emoticon Grid */}
            <div className="p-2 overflow-y-auto" style={{ maxHeight: '340px' }}>
                <div className="grid grid-cols-8 gap-1">
                    {emoticons.map((emoticon) => (
                        <div
                            key={emoticon.id}
                            onClick={() => handleEmoticonSelect(emoticon)}
                            className="
                                p-2
                                border border-transparent hover:border-[#31497C]
                                transition-colors duration-150
                                flex items-center justify-center
                            "
                            title={`${emoticon.name} (${emoticon.shortcuts[0]})`}
                        >
                            <img
                                src={emoticon.imageUrl}
                                alt={emoticon.name}
                                className="w-6 h-6"
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer with shortcut hint */}
            <div
                className="px-3 py-2 border-t border-[#ACA899] bg-[#F5F5F5] text-xs text-gray-600"
                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
            >
                Tip: Hover over an emoticon to see its shortcut
            </div>
        </div>
    );
}
