export interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        webSearchEnabled?: boolean;
        sources?: WebSearchSource[];
        model?: string;
    };
}

export interface WebSearchSource {
    title: string;
    url: string;
    snippet: string;
    relevance?: number;
}

export interface AIConversation {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    webSearchEnabled: boolean;
}

export interface AIResponse {
    success: boolean;
    message?: AIMessage;
    webSearchResults?: WebSearchSource[];
    error?: string;
}

export interface SendAIMessageData {
    conversationId: string;
    content: string;
    webSearchEnabled: boolean;
}

export interface CreateAIConversationData {
    title: string;
}
