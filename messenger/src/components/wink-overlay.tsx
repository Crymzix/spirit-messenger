import { useEffect, useRef, useState } from 'react';
import { useWinkStore } from '@/lib/store/wink-store';

export function WinkOverlay() {
    const { currentWink, removeCurrentWink } = useWinkStore();
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!currentWink) {
            setIsLoaded(false);
            return;
        }

        // Reset loaded state when new wink appears
        setIsLoaded(false);

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [currentWink]);

    const handleImageLoad = () => {
        setIsLoaded(true);

        if (!currentWink) return;
        timeoutRef.current = setTimeout(() => {
            removeCurrentWink();
        }, 5000);
    };

    const handleImageError = () => {
        // If image fails to load, remove it immediately
        removeCurrentWink();
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    if (!currentWink) {
        return null;
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Semi-transparent backdrop */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Wink image */}
            <div className="relative z-10 max-w-[80%] max-h-[80%] animate-fade-in">
                <img
                    ref={imgRef}
                    src={currentWink.url}
                    alt="Wink"
                    className="max-w-full max-h-full object-contain drop-shadow-2xl"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 0.2s ease-in-out',
                    }}
                />
            </div>
        </div>
    );
}