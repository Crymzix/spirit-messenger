import { useState, useRef, useEffect } from 'react';

interface TextFormatterProps {
    onFormatChange: (formatting: { bold?: boolean; italic?: boolean; color?: string }) => void;
    currentFormatting?: { bold?: boolean; italic?: boolean; color?: string };
    onClose?: () => void;
}

const PRESET_COLORS = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#008000', // Dark Green
    '#000080', // Navy
    '#800000', // Maroon
];

export function TextFormatter({ onFormatChange, currentFormatting = {}, onClose }: TextFormatterProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorPickerRef = useRef<HTMLDivElement>(null);
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

    // Handle click outside to close color picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setShowColorPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleBold = () => {
        onFormatChange({
            ...currentFormatting,
            bold: !currentFormatting.bold,
        });
    };

    const toggleItalic = () => {
        onFormatChange({
            ...currentFormatting,
            italic: !currentFormatting.italic,
        });
    };

    const selectColor = (color: string) => {
        onFormatChange({
            ...currentFormatting,
            color: color === currentFormatting.color ? undefined : color,
        });
        setShowColorPicker(false);
    };

    return (
        <div
            ref={pickerRef}
            className="absolute flex items-center gap-1 bottom-8 z-50 bg-white p-1 border-[1px] border-[#31497C]"
        >
            {/* Bold Button */}
            <div
                onClick={toggleBold}
                className={`
                    w-8 h-8 flex items-center justify-center
                    border border-[#ACA899] rounded
                    transition-colors duration-150
                    ${currentFormatting.bold
                        ? 'bg-[#D8E8F7] border-[#31497C]'
                        : 'bg-white hover:bg-[#F5F5F5]'
                    }
                `}
                title="Bold (Ctrl+B)"
            >
                <span className="font-bold text-sm">B</span>
            </div>

            {/* Italic Button */}
            <div
                onClick={toggleItalic}
                className={`
                    w-8 h-8 flex items-center justify-center
                    border border-[#ACA899] rounded
                    transition-colors duration-150
                    ${currentFormatting.italic
                        ? 'bg-[#D8E8F7] border-[#31497C]'
                        : 'bg-white hover:bg-[#F5F5F5]'
                    }
                `}
                title="Italic (Ctrl+I)"
            >
                <span className="italic text-sm">I</span>
            </div>

            {/* Color Picker Button */}
            <div
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`
                    w-8 h-8 flex items-center justify-center
                    border border-[#ACA899] rounded
                    transition-colors duration-150
                    ${showColorPicker || currentFormatting.color
                        ? 'bg-[#D8E8F7] border-[#31497C]'
                        : 'bg-white hover:bg-[#F5F5F5]'
                    }
                `}
                title="Text Color"
            >
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold">A</span>
                    <div
                        className="w-6 h-1 mt-0.5"
                        style={{
                            backgroundColor: currentFormatting.color || '#000000',
                        }}
                    />
                </div>
            </div>

            {/* Color Picker Popup */}
            {showColorPicker && (
                <div
                    ref={colorPickerRef}
                    className="absolute bottom-10 z-50 bg-white border-[1px] border-[#31497C] w-max"
                >
                    {/* Color Grid */}
                    <div className="p-2">
                        <div className="grid grid-cols-4 gap-2 w-max">
                            {PRESET_COLORS.map((color) => (
                                <div
                                    key={color}
                                    onClick={() => selectColor(color)}
                                    className={`
                                        size-8 border transition-all duration-150 aspect-square
                                        ${currentFormatting.color === color
                                            ? 'border-2 border-[#31497C]'
                                            : 'border border-transparent hover:border-[#31497C]'
                                        }
                                    `}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Footer with reset button */}
                    <div
                        className="px-3 py-2 border-t border-[#ACA899] bg-[#F5F5F5]"
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                    >
                        <button
                            onClick={() => selectColor('#000000')}
                            className="w-full px-2 py-1 text-xs bg-white hover:bg-[#E6ECF9] border border-[#ACA899] transition-colors duration-150"
                        >
                            Reset to Black
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
