import { useState, useRef, useEffect, useMemo } from "react";
import { User, Message } from "@/types";
import { TitleBar } from "../title-bar";
import { useUser } from "@/lib";

interface ChatWindowProps {
    conversation?: {
        id: string;
        type: 'one_on_one' | 'group';
        name?: string;
        participants: User[];
    };
    onClose?: () => void;
}

export function ChatWindow({ conversation, onClose }: ChatWindowProps) {
    const user = useUser()
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
    const [activeTab, setActiveTab] = useState<"type" | "handwrite">('type');
    const messageHistoryRef = useRef<HTMLDivElement>(null);

    console.log(user)
    const participants = useMemo(() => {
        return conversation?.participants.filter(p => p.id !== user?.id) || []
    }, [conversation])

    // Get the conversation title
    const getConversationTitle = () => {
        if (conversation?.type === 'group') {
            return conversation.name || 'Group Chat';
        }
        const otherParticipant = conversation?.participants.find(p => p.id !== user?.id);
        return otherParticipant?.displayName || 'Chat';
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messageHistoryRef.current) {
            messageHistoryRef.current.scrollTop = messageHistoryRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;

        // TODO: Implement message sending via React Query hook
        // For now, just add to local state
        const newMessage: Message = {
            id: `temp-${Date.now()}`,
            conversationId: conversation?.id!!,
            senderId: user?.id!!,
            content: messageInput,
            messageType: 'text',
            metadata: {},
            createdAt: new Date(),
        };

        setMessages([...messages, newMessage]);
        setMessageInput("");
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleEmoticonClick = (emoticon: string) => {
        setMessageInput(messageInput + emoticon);
        setShowEmoticonPicker(false);
    };

    return (
        <div className="window w-full h-screen flex flex-col">
            <TitleBar title={`${participants.map(p => p.displayName || p.username).join(", ")} - Conversation`} />
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
                                    <div className="whitespace-nowrap box-border hidden min-[346px]:block cursor-pointer">
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
                                    <div className="whitespace-nowrap box-border hidden min-[346px]:block cursor-pointer">
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
                                    <div className="whitespace-nowrap box-border hidden min-[346px]:block cursor-pointer">
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
                                    <div className="whitespace-nowrap box-border hidden min-[388px]:block cursor-pointer">
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
                                    <div className="whitespace-nowrap box-border hidden min-[470px]:block cursor-pointer">
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
                                <div
                                    ref={messageHistoryRef}
                                    className="flex-1 bg-white border-[1px] border-[#31497C] rounded-t-xl"
                                >
                                    <div
                                        style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                        className="flex items-center gap-1 text-[#31497C] bg-[#E6ECF9] border-b-[1px] border-[#31497C] rounded-t-xl px-2 py-1.5 text-lg"
                                    >
                                        <div>To: </div>
                                        <div className="font-bold">
                                            {participants.map(p => p.displayName || p.username).join(", ")}
                                        </div>
                                    </div>
                                    <div className="space-y-2 overflow-y-auto p-2">
                                        {messages.map((message) => {
                                            const sender = conversation?.participants.find(p => p.id === message.senderId);
                                            const isCurrentUser = message.senderId === user?.id;

                                            return (
                                                <div key={message.id} className="text-[10px]">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className={`font-bold ${isCurrentUser ? 'text-[#CC0000]' : 'text-[#0066CC]'}`}>
                                                            {sender?.displayName || 'Unknown'}:
                                                        </span>
                                                        <span className="text-black">{message.content}</span>
                                                    </div>
                                                    <div className="text-[9px] text-gray-500 ml-1">
                                                        {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* MSN Messenger Avatar */}
                                <div className="hidden min-[470px]:block">
                                    <div className="w-[104px] flex items-center flex-col border border-[#586170] pt-[3px] rounded-lg relative bg-[#dee7f7]">
                                        <img className="size-[96px] border border-[#586170] rounded-[7px]" src="/msn.png" alt="" />
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
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <img src="/text.png" className="size-8" />
                                            Font
                                        </div>
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <img src="/emoticon.png" className="size-8" />
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
                                            className="flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <img src="/nudge.png" className="size-8" />
                                        </div>
                                    </div>
                                    <textarea
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type a message..."
                                        className="w-full flex-1 !p-2 !text-lg border border-[#ACA899] rounded resize-none focus:outline-none focus:border-msn-blue"
                                    />

                                    {/* Bottom Bar */}
                                    <div
                                        style={{
                                            background: "linear-gradient(#D8E8F7, #F5F2F9, #D8E8F7)"
                                        }}
                                        className="flex border-t-[1px] border-[#31497C] rounded-b-xl">
                                        {/* TODO Add last message received timestamp. */}
                                        <div
                                            style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                            className="flex items-center px-3"
                                        >
                                            Last message received at 5:46 AM on 1/22/2025.
                                        </div>
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
                                        <img className="size-[96px] border border-[#586170] rounded-[7px]" src={user?.displayPictureUrl || "/msn.png"} alt="" />
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
