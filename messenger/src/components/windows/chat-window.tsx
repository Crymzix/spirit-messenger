import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { User } from "@/types";
import { TitleBar } from "../title-bar";
import { useUser } from "@/lib";
import { useSendMessage, useConversationMessagesInfinite, useConversationRealtimeUpdates, useSendNudge } from "@/lib/hooks/message-hooks";
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { useTypingIndicator } from "@/lib/hooks/typing-hooks";
import { useConversation, useParticipantRealtimeUpdates } from "@/lib/hooks/conversation-hooks";
import { TypingIndicator } from "../typing-indicator";
import { EmoticonPicker } from "../emoticon-picker";
import { MessageContent } from "../message-content";
import { TextFormatter } from "../text-formatter";
import { Emoticon, findEmoticonMatches } from "@/lib/emoticons";
import { FileTransferRequestMessage } from "../file-transfer-request-message";
import { useInitiateFileTransfer } from "@/lib/hooks/file-hooks";
import { createFileInput, validateFile } from "@/lib/utils/file-utils";
import { useFileUploadStore, fileToArrayBuffer } from "@/lib/store/file-upload-store";

export function ChatWindow() {
    // Extract contactId and contactName from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const contactId = params.get('contactId');
    const contactName = params.get('contactName');

    // Find or create conversation with the contact
    const {
        data: conversation,
        isLoading: isLoadingConversation,
        error: conversationError
    } = useConversation(contactId);

    const user = useUser()
    const [messageInput, setMessageInput] = useState("");
    const [activeTab, setActiveTab] = useState<"type" | "handwrite">('type');
    const [isTyping, setIsTyping] = useState(false);
    const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
    const [showFontPicker, setShowFontPicker] = useState(false)
    const [formatting, setFormatting] = useState<{ bold?: boolean; italic?: boolean; color?: string }>({});
    const messageHistoryRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // File transfer mutations
    const initiateTransferMutation = useInitiateFileTransfer();
    const emitFileTransferInitiated = useFileUploadStore((state) => state.emitFileTransferInitiated);

    const sendMessageMutation = useSendMessage(conversation?.id || '');
    const sendNudgeMutation = useSendNudge(conversation?.id || '');
    const {
        data: messagesQueryData,
        isLoading: isLoadingMessages,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useConversationMessagesInfinite(conversation?.id || '', 50);

    const messagesData = messagesQueryData?.messages || [];

    // Shake window when nudge is received
    const handleNudgeReceived = useCallback(async () => {
        const window = getCurrentWindow();
        const position = await window.outerPosition();
        const originalX = position.x;
        const originalY = position.y;

        const shakeIntensity = 10;
        const shakeDuration = 500;
        const shakeInterval = 50;

        const iterations = shakeDuration / shakeInterval;
        let count = 0;

        const interval = setInterval(async () => {
            if (count >= iterations) {
                clearInterval(interval);
                await window.setPosition(new PhysicalPosition(originalX, originalY));
                return;
            }

            const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
            const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;

            await window.setPosition(new PhysicalPosition(
                Math.round(originalX + offsetX),
                Math.round(originalY + offsetY)
            ));

            count++;
        }, shakeInterval);
    }, []);

    useConversationRealtimeUpdates(conversation?.id);

    // Listen for nudge events from the global message listener
    useEffect(() => {
        if (!conversation?.id) return;

        const unlisten = listen<{ conversationId: string; senderId: string }>(
            'nudge-received',
            (event) => {
                if (event.payload.conversationId === conversation.id) {
                    handleNudgeReceived();
                }
            }
        );

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [conversation?.id, handleNudgeReceived]);

    // Typing indicator hook
    const { typingUsers, setTyping } = useTypingIndicator(conversation?.id || null);

    const participants = useMemo(() => {
        return conversation?.participants.filter(p => p.id !== user?.id) || []
    }, [conversation, user?.id])

    useParticipantRealtimeUpdates(participants, conversation?.id);

    // Map typing user IDs to usernames based on conversation participants
    const typingUsernames = useMemo(() => {
        if (!typingUsers || typingUsers.length === 0 || !conversation?.participants) {
            return [];
        }

        return typingUsers
            .map(typingUser => {
                const participant = conversation.participants.find(p => p.id === typingUser.userId);
                return participant?.username || participant?.displayName || 'Unknown';
            })
            .filter(Boolean);
    }, [typingUsers, conversation?.participants])

    // Use contactName from URL if available, otherwise derive from participants
    const displayName = useMemo(() => {
        if (contactName) return contactName;
        return participants.map(p => p.displayName || p.username).join(", ");
    }, [contactName, participants])

    const canSend = useMemo(() => {
        if (!messageInput?.trim()) {
            return false
        }

        if (isLoadingConversation || isLoadingMessages || sendMessageMutation.isPending) {
            return false
        }

        return true
    }, [isLoadingConversation, isLoadingMessages, sendMessageMutation.isPending, messageInput])

    // Calculate last message received from other users (not sent by current user)
    const lastMessageReceived = useMemo(() => {
        if (!messagesData || messagesData.length === 0 || !user) {
            return null;
        }

        // Find the most recent message that was NOT sent by the current user
        // Iterate from the end (most recent) to find the last received message
        for (let i = messagesData.length - 1; i >= 0; i--) {
            const message = messagesData[i];
            if (message.senderId !== user.id) {
                return message;
            }
        }

        return null;
    }, [messagesData, user])

    // Format the last message timestamp
    const lastMessageTimestamp = useMemo(() => {
        if (!lastMessageReceived) {
            return 'No messages received yet.';
        }

        const messageDate = new Date(lastMessageReceived.createdAt);

        // Format time as HH:MM AM/PM
        const hours = messageDate.getHours();
        const minutes = messageDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;

        // Format date as M/D/YYYY
        const month = messageDate.getMonth() + 1;
        const day = messageDate.getDate();
        const year = messageDate.getFullYear();
        const dateStr = `${month}/${day}/${year}`;

        return `Last message received at ${timeStr} on ${dateStr}.`;
    }, [lastMessageReceived])

    useEffect(() => {
        if (messageHistoryRef.current) {
            // Use requestAnimationFrame to ensure DOM has updated
            requestAnimationFrame(() => {
                if (messageHistoryRef.current) {
                    messageHistoryRef.current.scrollTop = messageHistoryRef.current.scrollHeight;
                }
            });
        }
    }, [messagesData]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !conversation?.id) {
            return;
        }
        if (!canSend) {
            return
        }

        try {
            // Clear typing status before sending
            if (isTyping) {
                setTyping(false);
                setIsTyping(false);
            }

            // Find emoticon matches in the message
            const emoticonMatches = findEmoticonMatches(messageInput.trim());

            // Build emoticon metadata
            const emoticonMetadata = emoticonMatches.map(match => ({
                position: match.startIndex,
                code: match.emoticon.id
            }));

            await sendMessageMutation.mutateAsync({
                conversationId: conversation.id,
                content: messageInput.trim(),
                messageType: 'text',
                metadata: {
                    emoticons: emoticonMetadata.length > 0 ? emoticonMetadata : undefined,
                    formatting: (formatting.bold || formatting.italic || formatting.color) ? formatting : undefined
                },
            });

            // Clear input on success
            setMessageInput("");
        } catch (error) {
            console.error('Failed to send message:', error);
            // Optionally show error to user
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;

        // Note: Emoticon shortcuts are kept as text in the input
        // They will be automatically converted to images when the message is displayed
        // The findEmoticonMatches function will detect them when sending

        setMessageInput(value);

        // Set typing status
        if (value.length > 0 && !isTyping) {
            setIsTyping(true);
            setTyping(true);
        } else if (value.length === 0 && isTyping) {
            setIsTyping(false);
            setTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle Enter key for sending message
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
            return;
        }

        // Handle Ctrl+B for bold
        if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            setFormatting(prev => ({ ...prev, bold: !prev.bold }));
            return;
        }

        // Handle Ctrl+I for italic
        if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            setFormatting(prev => ({ ...prev, italic: !prev.italic }));
            return;
        }
    };

    const handleEmoticonSelect = (emoticon: Emoticon) => {
        // Insert emoticon shortcut at cursor position
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const text = messageInput;
            const before = text.substring(0, start);
            const after = text.substring(end);
            const newText = before + emoticon.shortcuts[0] + ' ' + after;

            setMessageInput(newText);

            // Set cursor position after the inserted emoticon
            setTimeout(() => {
                if (textareaRef.current) {
                    const newPosition = start + emoticon.shortcuts[0].length + 1;
                    textareaRef.current.selectionStart = newPosition;
                    textareaRef.current.selectionEnd = newPosition;
                    textareaRef.current.focus();
                }
            }, 0);
        }

        setShowEmoticonPicker(false);
    };

    const handleSendFileClick = () => {
        createFileInput((file) => {
            const validation = validateFile(file);
            if (!validation.valid) {
                return;
            }
            handleInitiateFileTransfer(file);
        });
    };

    const handleInitiateFileTransfer = async (file: File) => {
        if (!conversation?.id || !user) return;

        // For one-on-one conversations, get the receiver ID
        const receiverId = conversation.type === 'one_on_one'
            ? participants[0]?.id
            : null;

        try {
            // Initiate the transfer request on the backend
            const result = await initiateTransferMutation.mutateAsync({
                conversationId: conversation.id,
                receiverId,
                filename: file.name,
                fileSize: file.size,
                mimeType: file.type || 'application/octet-stream',
            });

            // Convert file to array buffer for cross-window transfer
            const fileData = await fileToArrayBuffer(file);

            // Emit event to main window to store the file for upload
            await emitFileTransferInitiated({
                transferId: result.transferRequest.id,
                conversationId: conversation.id,
                receiverId,
                filename: file.name,
                fileSize: file.size,
                mimeType: file.type || 'application/octet-stream',
                fileData,
            });

        } catch (error) {
            console.error('Failed to initiate file transfer:', error);
        }
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title={`${displayName} - Conversation`} />
            <div className="window-body flex-1 !my-[0px] !mx-[3px] relative flex flex-col min-h-0">
                <div className="flex flex-col overflow-hidden">
                    {/* Menu Bar */}
                    <div className="">
                        <div className="flex gap-0.5 text-md">
                            <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                                File
                            </label>
                            <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                                Edit
                            </label>
                            <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                                Actions
                            </label>
                            <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                                Tools
                            </label>
                            <label className="px-3 py-1 cursor-pointer hover:bg-[#245DDA] hover:text-white">
                                Help
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col h-full overflow-y-hidden relative">
                    {/* Background */}
                    <div
                        className="h-full w-full absolute"
                        style={{
                            background: "linear-gradient(#c9d9f1, #f6f6f6 50%, #c9d9f1)"
                        }}
                    >
                        <img
                            className="bottom-0 right-0 w-[600px] absolute"
                            src="/msn-background.png"
                        />
                    </div>
                    {/* MSN Messenger Toolbar */}
                    <div className="overflow-hidden shrink-0">
                        <div className="w-full h-full grid grid-cols-[minmax(10px,300px)_3fr] relative z-[1]">
                            {/* Toolbar Left */}
                            <div
                                className="h-[58px] place-items-center justify-start items-center grid gap-x-5 pl-[30px] grid-cols-[auto_auto] bg-no-repeat bg-[top_left,top] box-border"
                                style={{
                                    backgroundImage: "url('/toolbar/background/1_806.png'), url('/toolbar/background/2_805.png')",
                                    backgroundRepeat: 'no-repeat, repeat-x',
                                    backgroundPosition: 'top left, top'
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="whitespace-nowrap box-border hidden min-[346px]:block cursor-pointer hover:opacity-80">
                                        <div className="flex flex-col items-center justify-center ">
                                            <img src="/toolbar/invite.png" alt="" />
                                            <div className="text">
                                                <div
                                                    className="text-[#31497C]"
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    Invite
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        onClick={handleSendFileClick}
                                        className="whitespace-nowrap box-border hidden min-[346px]:block cursor-pointer hover:opacity-80"
                                    >
                                        <div className="flex flex-col items-center">
                                            <img src="/toolbar/send-files.png" alt="" />
                                            <div className="text">
                                                <div
                                                    className="text-[#31497C]"
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    Send Files
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="whitespace-nowrap box-border hidden min-[346px]:block cursor-pointer hover:opacity-80">
                                        <div className="flex flex-col items-center">
                                            <img src="/toolbar/webcam.png" alt="" />
                                            <div className="text">
                                                <div
                                                    className="text-[#31497C]"
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    Webcam
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="whitespace-nowrap box-border hidden min-[388px]:block cursor-pointer hover:opacity-80">
                                        <div className="flex flex-col items-center">
                                            <img src="/toolbar/voice.png" alt="" />
                                            <div className="text">
                                                <div
                                                    className="text-[#31497C]"
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    Audio
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="whitespace-nowrap box-border hidden min-[470px]:block cursor-pointer hover:opacity-80">
                                        <div className="flex flex-col items-center">
                                            <img src="/toolbar/games.png" alt="" />
                                            <div className="text">
                                                <div
                                                    className="text-[#31497C]"
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    Games
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Toolbar Right */}
                            <div
                                className="bg-no-repeat bg-[top_left,top_right,top]"
                                style={{
                                    backgroundImage: "url('/toolbar/background/3_803.png'), url('/toolbar/background/5_804.png'), url('/toolbar/background/4_802.png')",
                                    backgroundRepeat: 'no-repeat, no-repeat, repeat-x',
                                    backgroundPosition: 'top left, top right, top'
                                }}
                            >
                                <div className="flex box-border h-[21px] pt-[3px] pr-3">
                                    <img src="/spirit-logo.png" alt="" className="ml-auto h-6" />
                                </div>
                                <div
                                    className="relative -z-[1] h-[26px] max-w-[114px] box-border pl-[52px] mr-[35px] bg-repeat-x bg-[top] bg-content-box after:content-[''] after:absolute after:top-0 after:left-full after:w-[35px] after:h-[26px] after:bg-no-repeat after:bg-[top_right]"
                                    style={{
                                        backgroundImage: "url('/toolbar/background/mini-1_807.png')"
                                    }}
                                >
                                    <div className="pt-[2px] flex items-center gap-4">
                                        <div
                                            className="w-[19px] h-[19px] flex justify-center items-center bg-no-repeat cursor-pointer"
                                            style={{ backgroundImage: "url('/toolbar/background/small-circle-button_850.png')" }}
                                        >
                                            <img src="/toolbar/small-block.png" alt="" className="w-[13px] h-[13px]" />
                                        </div>
                                        <div
                                            className="w-[19px] h-[19px] flex justify-center items-center bg-no-repeat cursor-pointer"
                                            style={{ backgroundImage: "url('/toolbar/background/small-circle-button_850.png')" }}
                                        >
                                            <img src="/toolbar/small-paint.png" alt="" className="w-[13px] h-[13px]" />
                                        </div>
                                    </div>
                                    {/* After pseudo-element for the right edge */}
                                    <div
                                        className="absolute top-0 left-full w-[35px] h-[26px] bg-no-repeat bg-[top_right]"
                                        style={{
                                            backgroundImage: "url('/toolbar/background/mini-2_801.png')"
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex p-6 z-10 flex-1">
                        <div className="flex flex-col flex-1 min-h-0 z-10 gap-4">
                            <div className="flex flex-1 gap-4">
                                {/* Message History Panel */}
                                <div className="flex-1 bg-white border-[1px] border-[#31497C] rounded-t-xl flex flex-col">
                                    <div
                                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                        className="flex items-center gap-1 text-[#31497C] bg-[#E6ECF9] border-b-[1px] border-[#31497C] rounded-t-xl px-2 py-1.5 text-lg"
                                    >
                                        <div>To: </div>
                                        <div className="font-bold">
                                            {displayName}
                                        </div>
                                    </div>
                                    <div
                                        ref={messageHistoryRef}
                                        className="space-y-2 overflow-y-auto h-[calc(100vh-306px)] p-2"
                                    >
                                        {!isLoadingMessages && hasNextPage && (
                                            <div className="text-center py-2">
                                                <button
                                                    onClick={() => fetchNextPage()}
                                                    disabled={isFetchingNextPage}
                                                    className="px-3 py-1 text-[10px] bg-[#E6ECF9] hover:bg-[#D8E8F7] border border-[#31497C] rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    {isFetchingNextPage ? 'Loading...' : 'Load More Messages'}
                                                </button>
                                            </div>
                                        )}
                                        {messagesData.map((message) => {
                                            const sender = message.sender || conversation?.participants.find((p: User) => p.id === message.senderId);
                                            const isFileTransfer = message.messageType === 'file';

                                            return (
                                                <div key={message.id} className="text-lg">
                                                    <div className="flex flex-col">
                                                        <div
                                                            style={{
                                                                fontFamily: 'Pixelated MS Sans Serif'
                                                            }}
                                                        >
                                                            {`${sender?.displayName || 'Unknown'} ${isFileTransfer ? 'sends' : 'says'}`}:
                                                        </div>
                                                        <div className="font-verdana text-black ml-4">
                                                            {
                                                                isFileTransfer ?
                                                                    <FileTransferRequestMessage
                                                                        message={message}
                                                                    /> :
                                                                    <MessageContent
                                                                        content={message.content}
                                                                        metadata={message.metadata}
                                                                    />
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {
                                            sendMessageMutation.isPending && (
                                                <div className="!text-lg text-gray-500 italic">
                                                    Sending...
                                                </div>
                                            )
                                        }
                                        {
                                            (isLoadingConversation || isLoadingMessages) && (
                                                <div className="!text-lg text-gray-500 italic">
                                                    Loading...
                                                </div>
                                            )
                                        }
                                        {
                                            conversationError && (
                                                <div className="!text-lg text-red-600 italic">
                                                    {(conversationError as Error)?.message || 'An error occurred'}
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                                {/* MSN Messenger Avatar */}
                                <div className="hidden min-[470px]:block">
                                    <div className="w-[104px] flex items-center flex-col border border-[#586170] pt-[3px] rounded-lg relative bg-[#dee7f7]">
                                        <img className="size-[96px] border border-[#586170] rounded-[7px]" src={participants[0]?.displayPictureUrl || '/default-profile-pictures/friendly_dog.png'} alt="" />
                                        <img className="self-end m-[3px_5px]" src="/down.png" alt="" />
                                        <img className="absolute top-1 right-0 translate-x-[9px]" src="/expand-left.png" alt="" />
                                    </div>
                                </div>
                            </div>
                            {/* Chat Area */}
                            <div className="flex gap-4">
                                <div className="flex flex-col flex-1 bg-white border-[1px] border-[#31497C] rounded-xl">
                                    {/* Toolbar */}
                                    <div
                                        style={{
                                            background: "linear-gradient(#D8E8F7, #F5F2F9, #D8E8F7)"
                                        }}
                                        className="flex items-center gap-2 px-2 py-1 border-b-[1px] border-[#31497C] rounded-t-xl">
                                        <div
                                            onClick={() => setShowFontPicker(true)}
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="flex items-center gap-0.5 cursor-pointer relative"
                                        >
                                            <img src="/text.png" className="size-8" />
                                            Font
                                            {showFontPicker && (
                                                <TextFormatter
                                                    onFormatChange={setFormatting}
                                                    currentFormatting={formatting}
                                                    onClose={() => setShowFontPicker(false)}
                                                />
                                            )}
                                        </div>
                                        <div
                                            onClick={() => setShowEmoticonPicker(true)}
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="flex items-center gap-0.5 cursor-pointer relative"
                                        >
                                            <img src="/emoticon.png" className="size-8" />
                                            {showEmoticonPicker && (
                                                <EmoticonPicker
                                                    onSelect={handleEmoticonSelect}
                                                    onClose={() => setShowEmoticonPicker(false)}
                                                />
                                            )}
                                        </div>
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <img src="/wink.png" className="size-8" />
                                            Winks
                                        </div>
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className={`flex items-center gap-0.5 ${sendNudgeMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                            onClick={() => {
                                                if (!sendNudgeMutation.isPending && conversation?.id) {
                                                    sendNudgeMutation.mutate();
                                                }
                                            }}
                                        >
                                            <img src="/nudge.png" className="size-8" />
                                        </div>
                                    </div>
                                    <div className="flex py-4 px-2">
                                        <textarea
                                            ref={textareaRef}
                                            value={messageInput}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyPress}
                                            placeholder="Type a message..."
                                            disabled={sendMessageMutation.isPending}
                                            className={`w-full flex-1 !font-verdana !text-lg border border-[#ACA899] rounded resize-none focus:outline-none focus:border-msn-blue disabled:opacity-50 disabled:cursor-not-allowed ${formatting.bold ? 'font-bold' : ''} ${formatting.italic ? 'italic' : ''}`}
                                            style={{
                                                color: formatting.color || 'inherit'
                                            }}
                                        />
                                        <div
                                            aria-disabled={!canSend}
                                            onClick={handleSendMessage}
                                            className={`!text-lg border border-[#93989C] bg-[#FBFBFB] w-[58px] h-full rounded-[5px] font-bold text-[0.6875em] flex items-center justify-center ${canSend ? "text-[#31497C] cursor-pointer" : "text-[#969C9A]"}`}
                                            style={{ boxShadow: '-4px -4px 4px #C0C9E0 inset', fontFamily: 'Pixelated MS Sans Serif' }}>
                                            Send
                                        </div>
                                    </div>

                                    {/* Bottom Bar */}
                                    <div
                                        style={{
                                            background: "linear-gradient(#D8E8F7, #F5F2F9, #D8E8F7)"
                                        }}
                                        className="flex border-t-[1px] border-[#31497C] rounded-b-xl">
                                        {/* Typing indicator */}
                                        {
                                            typingUsernames.length > 0 ? (
                                                <TypingIndicator
                                                    usernames={typingUsernames}
                                                />
                                            ) :
                                                <div
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                    className="flex items-center px-3"
                                                >
                                                    {lastMessageTimestamp}
                                                </div>
                                        }
                                        <div className="flex ml-auto mr-6 mb-1">
                                            {/* Handwrite Tab */}
                                            <div
                                                onClick={() => setActiveTab('handwrite')}
                                                className={`
                                                relative px-3 py-1 font-normal -mt-[1px]
                                                transition-all duration-150 rounded-b-lg border-[1px] border-[#31497C]
                                                cursor-pointer text-md
                                                ${activeTab === 'handwrite'
                                                        ? 'bg-white z-10'
                                                        : 'bg-[#e6eef3]'
                                                    }`}
                                                style={{
                                                    borderTop: activeTab === 'handwrite' ? '1px solid white' : '1px solid #31497C',
                                                    fontFamily: 'Pixelated MS Sans Serif'
                                                }}
                                            >
                                                Handwrite
                                                {activeTab === 'handwrite' && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 rounded-b-lg" />
                                                )}
                                            </div>

                                            {/* Type Tab */}
                                            <div
                                                onClick={() => setActiveTab('type')}
                                                className={`
                                                relative px-3 py-1 font-normal -mt-[1px] ml-[0.5px]
                                                transition-all duration-150 rounded-b-lg border-[1px] border-[#31497C]
                                                cursor-pointer text-md
                                                ${activeTab === 'type'
                                                        ? 'bg-white z-10'
                                                        : 'bg-[#e6eef3]'
                                                    }`}
                                                style={{
                                                    borderTop: activeTab === 'type' ? '1px solid white' : '1px solid #31497C',
                                                    fontFamily: 'Pixelated MS Sans Serif'
                                                }}
                                            >
                                                Type
                                                {activeTab === 'type' && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 rounded-b-lg" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* MSN Messenger Avatar */}
                                <div className="hidden min-[470px]:block">
                                    <div className="w-[104px] flex items-center flex-col border border-[#586170] pt-[3px] rounded-lg relative bg-[#dee7f7]">
                                        <img className="size-[96px] border border-[#586170] rounded-[7px]" src={user?.displayPictureUrl || "/default-profile-pictures/friendly_dog.png"} alt="" />
                                        <img className="self-end m-[3px_5px]" src="/down.png" alt="" />
                                        <img className="absolute top-1 right-0 translate-x-[9px]" src="/expand-left.png" alt="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        className="absolute bottom-0 left-0 w-full h-full pointer-events-none"
                        style={{
                            backgroundImage: `url('/main-corner-left.png'), url('/main-corner-right.png'), url('/main-left.png'), url('/main-right.png'), url('/main-bottom.png')`,
                            backgroundRepeat: 'no-repeat, no-repeat, repeat-y, repeat-y, repeat-x',
                            backgroundPosition: 'bottom left, bottom right, bottom left, bottom right, bottom',
                            clipPath: 'polygon(0 var(--toolbar-height), 100% 21px, 100% 100%, 0 100%)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
