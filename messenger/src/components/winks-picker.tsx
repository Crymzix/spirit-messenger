import { useState, useRef, useEffect } from 'react';
import { useTrendingGifs, useTrendingStickers, useTrendingMemes, useSearchGifs, useSearchStickers, useSearchMemes } from '@/lib/hooks/media-hooks';
import { MediaItem } from '@/lib/services/media-service';

interface WinksPickerProps {
    onSelect: (mediaUrl: string, mediaType: 'gif' | 'sticker' | 'meme') => void;
    onClose: () => void;
}

type MediaType = 'gifs' | 'stickers' | 'memes';

export function WinksPicker({ onSelect, onClose }: WinksPickerProps) {
    const [activeTab, setActiveTab] = useState<MediaType>('gifs');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const pickerRef = useRef<HTMLDivElement>(null);

    // Debounce search query
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Trending queries
    const { data: trendingGifs, isLoading: loadingGifs } = useTrendingGifs(20, 0);
    const { data: trendingStickers, isLoading: loadingStickers } = useTrendingStickers(20, 0);
    const { data: trendingMemes, isLoading: loadingMemes } = useTrendingMemes(20, 0);

    // Search queries (using debounced query)
    const { data: searchGifsData } = useSearchGifs(!!debouncedSearchQuery && activeTab === 'gifs', debouncedSearchQuery, 20, 0);
    const { data: searchStickersData } = useSearchStickers(!!debouncedSearchQuery && activeTab === 'stickers', debouncedSearchQuery, 20, 0);
    const { data: searchMemesData } = useSearchMemes(!!debouncedSearchQuery && activeTab === 'memes', debouncedSearchQuery, 20, 0);

    // Determine which data to show
    const currentData = debouncedSearchQuery
        ? (activeTab === 'gifs' ? searchGifsData : activeTab === 'stickers' ? searchStickersData : searchMemesData)
        : (activeTab === 'gifs' ? trendingGifs : activeTab === 'stickers' ? trendingStickers : trendingMemes);

    const isLoading = activeTab === 'gifs' ? loadingGifs : activeTab === 'stickers' ? loadingStickers : loadingMemes;

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Use a small delay to avoid closing immediately on open
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleMediaSelect = (item: MediaItem) => {
        const mediaType = activeTab === 'gifs' ? 'gif' : activeTab === 'stickers' ? 'sticker' : 'meme';
        onSelect(item.url, mediaType);
    };

    return (
        <div
            ref={pickerRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-8 z-50 bg-white border-[1px] border-[#31497C] w-[400px]"
        >
            {/* Header with tabs */}
            <div className="flex items-center border-b border-[#31497C] bg-[#E6ECF9] p-2 gap-2">
                <button
                    onClick={() => setActiveTab('gifs')}
                    className={`px-4 py-2 text-sm font-bold ${activeTab === 'gifs' ? 'bg-white border-b-2 border-white' : 'hover:bg-[#D8E8F7]'
                        }`}
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                >
                    GIFs
                </button>
                <button
                    onClick={() => setActiveTab('stickers')}
                    className={`px-4 py-2 text-sm font-bold ${activeTab === 'stickers' ? 'bg-white border-b-2 border-white' : 'hover:bg-[#D8E8F7]'
                        }`}
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                >
                    Stickers
                </button>
                <button
                    onClick={() => setActiveTab('memes')}
                    className={`px-4 py-2 text-sm font-bold ${activeTab === 'memes' ? 'bg-white border-b-2 border-white' : 'hover:bg-[#D8E8F7]'
                        }`}
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                >
                    Memes
                </button>
            </div>

            {/* Search bar */}
            <div className="p-2 border-b border-[#31497C]">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTab}...`}
                    className="w-full px-3 py-2 border border-[#ACA899] rounded focus:outline-none focus:border-[#31497C]"
                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                />
            </div>

            {/* Media grid */}
            <div className="h-[300px] overflow-y-auto p-2">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-[#31497C]" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                            Loading...
                        </div>
                    </div>
                ) : currentData?.results && currentData.results.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                        {currentData.results.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleMediaSelect(item)}
                                className="cursor-pointer hover:opacity-80 border border-[#ACA899] overflow-hidden aspect-square"
                            >
                                <img
                                    src={item.preview || item.url}
                                    alt={item.title || 'Media'}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-[#31497C]" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                            {searchQuery ? 'No results found' : 'No media available'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
