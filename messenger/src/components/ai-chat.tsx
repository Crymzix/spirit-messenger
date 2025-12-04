import { useState, useRef, useEffect, useMemo } from 'react';
import {
    useAIConversations,
    useAIMessages,
    useAIChatQueryClient
} from '@/lib/hooks/ai-chat-hooks';
import { useAIChatStore } from '@/lib/store/ai-chat-store';
import { sendAIMessageStream, deleteAIConversation } from '@/lib/services/ai-service';
import { loadSelectedModel } from '@/lib/utils/model-storage';
import type { AIMessage } from '@/types/ai';

const AVAILABLE_MODELS = [
    { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini', icon: '/chatgpt.png' },
    { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', icon: '/google.png' },
    { id: 'anthropic/claude-4.5-sonnet', label: 'Claude 4.5 Sonnet', icon: '/claude.png' },
    { id: 'x-ai/grok-4.1-fast', label: 'Grok 4.1 Fast', icon: '/xai.png' },
];

function MessageBubble({ message }: { message: AIMessage }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[80%] px-3 py-2 rounded text-lg ${isUser
                    ? 'bg-[#31497C] text-white'
                    : 'bg-[#E6ECF9] text-[#31497C] border border-[#31497C]'
                    }`}
                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
            >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                {message.metadata?.sources && message.metadata.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-current text-xs">
                        <p className="font-bold mb-1">Sources:</p>
                        {message.metadata.sources.map((source, idx) => (
                            <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:underline truncate"
                            >
                                {source.title}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function AIChat() {
    const messageHistoryRef = useRef<HTMLDivElement>(null);
    const [messageInput, setMessageInput] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const modelDropdownRef = useRef<HTMLDivElement>(null);

    const {
        activeConversationId,
        webSearchEnabled,
        selectedModel,
        setActiveConversation,
        setSelectedModel,
    } = useAIChatStore();

    const { data: conversations = [], isLoading: isLoadingConversations } = useAIConversations();
    const queryClient = useAIChatQueryClient();

    const activeConversation = useMemo(
        () => conversations.find(c => c.id === activeConversationId),
        [conversations, activeConversationId]
    );

    const { data: messages = [], isLoading: isLoadingMessages } =
        useAIMessages(activeConversationId || '');

    // Load persisted model selection on mount
    useEffect(() => {
        loadSelectedModel().then(model => {
            setSelectedModel(model);
        }).catch(err => console.error('Failed to load model:', err));
    }, [setSelectedModel]);

    // Handle model dropdown click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
                setIsModelDropdownOpen(false);
            }
        }

        if (isModelDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isModelDropdownOpen]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messageHistoryRef.current) {
            requestAnimationFrame(() => {
                if (messageHistoryRef.current) {
                    messageHistoryRef.current.scrollTop = messageHistoryRef.current.scrollHeight;
                }
            });
        }
    }, [messages, streamingContent]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isStreaming) return;

        const content = messageInput.trim();
        setMessageInput('');
        setIsStreaming(true);
        setStreamingContent('');

        // Optimistically add user message
        const tempUserMessage: AIMessage = {
            id: `temp-user-${Date.now()}`,
            role: 'user',
            content,
            timestamp: new Date(),
        };

        let currentConversationId = activeConversationId;

        if (currentConversationId) {
            queryClient.addMessage(currentConversationId, tempUserMessage);
        }

        await sendAIMessageStream(
            {
                conversationId: activeConversationId || undefined,
                content,
                webSearchEnabled,
                model: selectedModel,
            },
            {
                onConversation: (conversation) => {
                    // New conversation created
                    queryClient.addConversation(conversation);
                    setActiveConversation(conversation.id);
                    currentConversationId = conversation.id;
                    // Add the user message to the new conversation
                    queryClient.addMessage(conversation.id, tempUserMessage);
                },
                onChunk: (chunk) => {
                    setStreamingContent(prev => prev + chunk);
                },
                onComplete: (data) => {
                    setIsStreaming(false);
                    setStreamingContent('');

                    // Update with real messages
                    if (currentConversationId) {
                        queryClient.invalidateMessages(currentConversationId);
                    }

                    // Update title if generated
                    if (data.title && currentConversationId) {
                        queryClient.updateConversationTitle(currentConversationId, data.title);
                    }
                },
                onError: (error) => {
                    setIsStreaming(false);
                    setStreamingContent('');
                    console.error('AI message error:', error);
                    // Remove optimistic message on error
                    if (currentConversationId) {
                        queryClient.invalidateMessages(currentConversationId);
                    }
                },
            }
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSelectConversation = (id: string) => {
        setActiveConversation(id);
        setSidebarOpen(false);
    };

    const handleNewConversation = () => {
        setActiveConversation(null);
        setSidebarOpen(false);
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            await deleteAIConversation(id);
            queryClient.invalidateConversations();
            if (activeConversationId === id) {
                setActiveConversation(null);
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const canSend = !!messageInput.trim() && !isStreaming;
    const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel)

    return (
        <div className="relative flex flex-col h-[calc(100vh-173.5px)] bg-white overflow-hidden ml-[2px]">
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="absolute inset-0 bg-black/20 z-10"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sliding Sidebar */}
            <div className={`absolute top-0 left-0 h-full w-56 bg-white border-r border-[#31497C] z-20 flex flex-col transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="p-2 border-b border-[#A1A4B9] flex items-center justify-between">
                    <span className="!text-md font-bold text-[#31497C]" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                        Conversations
                    </span>
                    <div className="flex items-center gap-1">
                        <div
                            onClick={() => setSidebarOpen(false)}
                            className="text-[#31497C] hover:text-[#245DDA] !text-2xl px-1 cursor-pointer"
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        >
                            ✕
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoadingConversations ? (
                        <div className="p-2 text-md text-center text-[#31497C]" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                            Loading...
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-2 text-md text-center text-[#6B7280]" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                            No conversations yet
                        </div>
                    ) : (
                        conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                onClick={() => handleSelectConversation(conversation.id)}
                                className={`p-2 border-b border-[#A1A4B9] cursor-pointer text-xs flex items-center justify-between group ${activeConversationId === conversation.id
                                    ? 'bg-[#31497C] text-white'
                                    : 'hover:bg-[#D8E8F7] text-[#31497C]'
                                    }`}
                                style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                title={conversation.title}
                            >
                                <span className="truncate flex-1 !text-[12px]">{conversation.title}</span>
                                <span
                                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                    className={`ml-1 opacity-0 group-hover:opacity-100 hover:text-red-500 ${activeConversationId === conversation.id ? 'text-white' : ''}`}
                                    title="Delete"
                                >
                                    <img src='/trash.png' className='size-5' />
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="bg-[#E6ECF9] border-b border-[#31497C] px-3 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div
                        onClick={() => setSidebarOpen(true)}
                        className="text-[#31497C] hover:text-[#245DDA] text-sm cursor-pointer !text-2xl flex items-center mb-1"
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        title="Open conversations"
                    >
                        ☰
                    </div>
                    <div
                        className="!text-md font-bold text-[#31497C] truncate"
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                    >
                        {activeConversation?.title || 'AI Chat'}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Model Selector Dropdown */}
                    <div ref={modelDropdownRef} className='relative'>
                        <div
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-[#D8E8F7] text-[#31497C] !text-sm border border-[#A1A4B9] font-bold"
                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                            title="Select model"
                        >
                            {
                                currentModel ?
                                    <div className='flex items-center gap-2'>
                                        <img className='size-4' src={currentModel.icon} />
                                        {currentModel?.label}
                                    </div> :
                                    <div>Model</div>
                            }
                            <svg
                                className="pointer-events-none"
                                width="8"
                                height="5"
                                viewBox="0 0 8 5"
                                fill="none"
                            >
                                <path d="M0 0L4 5L8 0H0Z" fill="#24245D" />
                            </svg>
                        </div>
                        {isModelDropdownOpen && (
                            <div
                                style={{
                                    borderLeft: '1px solid #DFDFDF',
                                    borderTop: '1px solid #DFDFDF',
                                    borderRight: '1px solid #404040',
                                    borderBottom: '1px solid #404040',
                                }}
                                className="absolute top-full right-0 bg-white border border-gray-400 min-w-48 z-50 mt-1">
                                {AVAILABLE_MODELS.map((model) => (
                                    <div
                                        key={model.id}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setIsModelDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 !text-md transition-colors text-left whitespace-nowrap cursor-pointer ${selectedModel === model.id
                                            ? 'bg-[#31497C] text-white hover:bg-[#31497C]'
                                            : 'hover:bg-[#D8E8F7] hover:bg-msn-light-blue'
                                            }`}
                                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                    >
                                        <div className='w-4 flex items-center gap-1 justify-center'>
                                            <img className='size-4' src={model.icon} />
                                        </div>
                                        <span>{model.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div
                        onClick={handleNewConversation}
                        className="text-[#31497C] hover:text-[#245DDA] text-sm px-1 cursor-pointer"
                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                        title="New conversation"
                    >
                        <img src='/chat-plus.png' className='size-8' />
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={messageHistoryRef}
                className="flex-1 overflow-y-auto space-y-3 relative"
            >
                {isLoadingMessages && activeConversationId ? (
                    <div className="flex items-center justify-center h-full text-[#31497C] !text-md" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                        Loading messages...
                    </div>
                ) : messages.length === 0 && !isStreaming ? (
                    <div className="relative flex items-center justify-center h-full text-[#6B7280] !text-md" style={{ fontFamily: 'Pixelated MS Sans Serif' }}>
                        {/* Background */}
                        <div
                            className="h-full w-full absolute"
                            style={{
                                background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                            }}
                        >
                            <img src="/background-logo.png" className='opacity-15 w-64 absolute bottom-0 right-0 mb-10 mr-4' />
                        </div>

                        {activeConversationId ? 'Start the conversation!' : 'Type a message to start a new conversation'}
                    </div>
                ) : (
                    <div className='p-3 flex flex-col gap-2'>
                        {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                        {isStreaming && streamingContent && (
                            <div className="flex justify-start">
                                <div
                                    className="max-w-[80%] px-3 py-2 rounded text-lg bg-[#E6ECF9] text-[#31497C] border border-[#31497C]"
                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                >
                                    <p className="whitespace-pre-wrap break-words">{streamingContent}</p>
                                </div>
                            </div>
                        )}
                        {isStreaming && !streamingContent && (
                            <div className="flex justify-start">
                                <div
                                    className="bg-[#E6ECF9] text-[#31497C] border border-[#31497C] px-3 py-2 rounded text-lg italic"
                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                >
                                    AI is thinking...
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-[#31497C] py-4 px-2 shrink-0">
                <div className="flex gap-2">
                    <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={isStreaming}
                        className={`w-full flex-1 !font-verdana !text-lg border border-[#ACA899] rounded resize-none focus:outline-none focus:border-msn-blue disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    <div
                        aria-disabled={!canSend}
                        onClick={handleSendMessage}
                        className={`!text-lg border border-[#93989C] bg-[#FBFBFB] w-[58px] grow-0 rounded-[5px] font-bold text-[0.6875em] flex items-center justify-center ${canSend ? "text-[#31497C] cursor-pointer" : "text-[#969C9A]"}`}
                        style={{ boxShadow: '-4px -4px 4px #C0C9E0 inset', fontFamily: 'Pixelated MS Sans Serif' }}>
                        Send
                    </div>
                </div>
            </div>
        </div >
    );
}
