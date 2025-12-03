import { create } from 'zustand';

interface WinkItem {
    id: string;
    url: string;
    type: 'gif' | 'sticker' | 'meme';
}

interface WinkStore {
    winkQueue: WinkItem[];
    currentWink: WinkItem | null;
    addWink: (wink: WinkItem) => void;
    removeCurrentWink: () => void;
    processQueue: () => void;
}

export const useWinkStore = create<WinkStore>((set, get) => ({
    winkQueue: [],
    currentWink: null,

    addWink: (wink) => {
        const state = get();

        // If no wink is currently showing, show this one immediately
        if (!state.currentWink) {
            set({ currentWink: wink });
        } else {
            // Otherwise add to queue
            set((state) => ({
                winkQueue: [...state.winkQueue, wink],
            }));
        }
    },

    removeCurrentWink: () => {
        const { winkQueue } = get();

        // If there are winks in queue, show the next one immediately
        if (winkQueue.length > 0) {
            const [nextWink, ...remainingQueue] = winkQueue;
            set({
                currentWink: nextWink,
                winkQueue: remainingQueue,
            });
        } else {
            // No more winks, clear current
            set({ currentWink: null });
        }
    },

    processQueue: () => {
        const { winkQueue, currentWink } = get();
        if (winkQueue.length > 0 && !currentWink) {
            const [nextWink, ...remainingQueue] = winkQueue;
            set({
                currentWink: nextWink,
                winkQueue: remainingQueue,
            });
        }
    },
}));
