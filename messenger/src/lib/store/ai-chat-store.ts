import { create } from 'zustand';

interface AIChatState {
    activeConversationId: string | null;
    webSearchEnabled: boolean;
    isStreaming: boolean;

    setActiveConversation: (id: string | null) => void;
    setWebSearchEnabled: (enabled: boolean) => void;
    setIsStreaming: (streaming: boolean) => void;
}

export const useAIChatStore = create<AIChatState>((set) => ({
    activeConversationId: null,
    webSearchEnabled: true,
    isStreaming: false,

    setActiveConversation: (id) => set({ activeConversationId: id }),
    setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
    setIsStreaming: (streaming) => set({ isStreaming: streaming }),
}));

export function useActiveConversationId() {
    return useAIChatStore((state) => state.activeConversationId);
}

export function useWebSearchEnabled() {
    return useAIChatStore((state) => state.webSearchEnabled);
}

export function useIsStreaming() {
    return useAIChatStore((state) => state.isStreaming);
}
