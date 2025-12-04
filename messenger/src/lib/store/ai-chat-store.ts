import { create } from 'zustand';
import { saveSelectedModel } from '../utils/model-storage';

interface AIChatState {
    activeConversationId: string | null;
    webSearchEnabled: boolean;
    isStreaming: boolean;
    selectedModel: string;

    setActiveConversation: (id: string | null) => void;
    setWebSearchEnabled: (enabled: boolean) => void;
    setIsStreaming: (streaming: boolean) => void;
    setSelectedModel: (model: string) => void;
}

export const useAIChatStore = create<AIChatState>((set) => ({
    activeConversationId: null,
    webSearchEnabled: true,
    isStreaming: false,
    selectedModel: 'anthropic/claude-4.5-sonnet',

    setActiveConversation: (id) => set({ activeConversationId: id }),
    setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
    setIsStreaming: (streaming) => set({ isStreaming: streaming }),
    setSelectedModel: (model) => {
        set({ selectedModel: model });
        saveSelectedModel(model).catch(err => console.error('Failed to persist model selection:', err));
    },
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

export function useSelectedModel() {
    return useAIChatStore((state) => state.selectedModel);
}
