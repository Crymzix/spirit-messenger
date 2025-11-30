import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { User } from "@/types";
import { TitleBar } from "../title-bar";
import { useUser } from "@/lib";
import { useSendMessage, useConversationMessagesInfinite, useConversationRealtimeUpdates, useSendNudge, useMarkMessagesAsRead } from "@/lib/hooks/message-hooks";
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window';
import { Event, listen } from '@tauri-apps/api/event';
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
import Avatar from "boring-avatars";
import { HandwritingCanvas } from "../handwriting-canvas";
import { useContacts } from "@/lib/hooks/contact-hooks";
import { WINDOW_EVENTS } from "@/lib/utils/constants";
import { VoiceRecordingInterface } from "../voice-recording-interface";
import { VoiceMessagePlayer } from "../voice-message-player";
import { useSendVoiceClip } from "@/lib/hooks/voice-hooks";
import { useCallInitiate, useCallSignalUpdates } from "@/lib/hooks/call-hooks";
import { useCallStore, useHasActiveCall } from "@/lib/store/call-store";
import { callRealtimeService } from "@/lib/services/call-realtime-service";
import { simplePeerService } from "@/lib/services/simple-peer-service";
import { endCall, sendSignal } from "@/lib/services/call-service";
import { AudioCallOverlay } from "../audio-call-overlay";
import { VideoCallOverlay } from "../video-call-overlay";

export function ChatWindow() {
    // Extract contactId and contactName from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const contactUserId = params.get('contactUserId');
    const contactName = params.get('contactName');

    // Find or create conversation with the contact
    const {
        data: conversation,
        isLoading: isLoadingConversation,
        error: conversationError,
    } = useConversation(contactUserId);

    const user = useUser()
    const [messageInput, setMessageInput] = useState("");
    const [activeTab, setActiveTab] = useState<"type" | "handwrite">('type');
    const [isTyping, setIsTyping] = useState(false);
    const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
    const [showFontPicker, setShowFontPicker] = useState(false)
    const [formatting, setFormatting] = useState<{ bold?: boolean; italic?: boolean; color?: string }>({});
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const messageHistoryRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const prevMessageCountRef = useRef<number>(0);
    const isLoadingOlderMessagesRef = useRef<boolean>(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);

    // File transfer mutations
    const initiateTransferMutation = useInitiateFileTransfer();
    const emitFileTransferInitiated = useFileUploadStore((state) => state.emitFileTransferInitiated);

    // Voice clip mutations
    const sendVoiceClipMutation = useSendVoiceClip(conversation?.id || '');

    // Call mutations
    const callInitiateMutation = useCallInitiate();
    const hasActiveCall = useHasActiveCall();
    const activeCall = useCallStore((state) => state.activeCall);
    const callState = useCallStore((state) => state.callState);
    const [callDeclinedMessage, setCallDeclinedMessage] = useState<string | null>(null);
    const [callError, setCallError] = useState<string | null>(null);
    const callStore = useCallStore()

    const sendMessageMutation = useSendMessage(conversation?.id || '');
    const sendNudgeMutation = useSendNudge(conversation?.id || '');
    const markAsReadMutation = useMarkMessagesAsRead();
    const {
        data: messagesQueryData,
        isLoading: isLoadingMessages,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useConversationMessagesInfinite(conversation?.id || '', 50);

    const messagesData = messagesQueryData?.messages || [];

    useCallSignalUpdates(activeCall?.id, (signalData) => {
        simplePeerService.signal(signalData);
    })

    // Mark messages as read when conversation is loaded and when window receives focus
    useEffect(() => {
        if (!conversation?.id) return;

        // Mark as read on initial load
        markAsReadMutation.mutate(conversation.id);

        // Track focus state and mark as read when window receives focus
        const appWindow = getCurrentWindow();
        const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
            setIsWindowFocused(focused);
            if (focused && conversation?.id) {
                markAsReadMutation.mutate(conversation.id);
            }
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [conversation?.id]);

    // Determine if we should show the blinking effect
    // Blink if window is unfocused and there are unread messages from other users
    const shouldBlink = useMemo(() => {
        if (isWindowFocused || !user || messagesData.length === 0) {
            return false;
        }
        // Check if any message from another user has readAt = null
        return messagesData.some(m => m.senderId !== user.id && !m.readAt);
    }, [isWindowFocused, user, messagesData]);

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
            WINDOW_EVENTS.NUDGE_RECEIVED,
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

    // Check if any participant is blocked based on contacts list
    const { data: blockedContacts, refetch: fetchBlockedContacts } = useContacts('blocked');

    const isContactBlocked = useMemo(() => {
        if (!participants || participants.length === 0) return false;

        // Check if any participant is in the blocked contacts list
        const participantIds = participants.map(p => p.id);
        const isBlocked = blockedContacts?.some(contact =>
            participantIds.includes(contact.contactUser.id)
        ) ?? false;

        return isBlocked;
    }, [participants, blockedContacts]);

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
        if (isContactBlocked) {
            return false
        }

        if (!messageInput?.trim()) {
            return false
        }

        if (isLoadingConversation || isLoadingMessages || sendMessageMutation.isPending) {
            return false
        }

        return true
    }, [isContactBlocked, isLoadingConversation, isLoadingMessages, sendMessageMutation.isPending, messageInput])

    // Determine if calls can be initiated
    const canInitiateCall = useMemo(() => {
        // Cannot initiate call if there's already an active call
        if (hasActiveCall) {
            return false;
        }

        // Cannot initiate call if contact is blocked
        if (isContactBlocked) {
            return false;
        }

        // Cannot initiate call if contact is offline or appear offline
        if (participants.length > 0) {
            const participant = participants[0];
            if (participant?.presenceStatus === 'offline' || participant?.presenceStatus === 'appear_offline') {
                return false;
            }
        }

        // Cannot initiate call if conversation is not loaded
        if (!conversation?.id) {
            return false;
        }

        return true;
    }, [hasActiveCall, isContactBlocked, participants, conversation?.id])

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
        if (messageHistoryRef.current && messagesData.length > 0) {
            const prevCount = prevMessageCountRef.current;
            const newCount = messagesData.length;

            // Only scroll to bottom if:
            // 1. Initial load (prevCount was 0)
            // 2. New messages added at the end (not pagination of older messages)
            const isInitialLoad = prevCount === 0;
            const isNewMessageAtEnd = newCount > prevCount && !isLoadingOlderMessagesRef.current;

            if (isInitialLoad || isNewMessageAtEnd) {
                requestAnimationFrame(() => {
                    if (messageHistoryRef.current) {
                        messageHistoryRef.current.scrollTop = messageHistoryRef.current.scrollHeight;
                    }
                });
            }

            prevMessageCountRef.current = newCount;
            isLoadingOlderMessagesRef.current = false;
        }
    }, [messagesData]);

    useEffect(() => {
        if (!conversation?.id) return;

        const unlisten = listen<{ userId: string }>(
            WINDOW_EVENTS.BLOCK_UPDATED,
            (event) => {
                if (participants.find(participant => participant.id === event?.payload.userId)) {
                    fetchBlockedContacts()
                }
            }
        );

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [conversation?.id, participants]);

    // Cleanup WebRTC connection handler and realtime subscriptions on unmount
    useEffect(() => {
        return () => {
            // Call cleanup function if it exists
            if ((window as any).__webrtcCleanup) {
                (window as any).__webrtcCleanup();
                (window as any).__webrtcCleanup = undefined;
            }

            // Unsubscribe from all realtime channels
            callRealtimeService.unsubscribeAll();
        };
    }, []);

    // Clear error when call state changes (call ends)
    useEffect(() => {
        if (callState === 'idle' || callState === 'ended') {
            // Clear any error messages when call ends
            setCallError(null);
        }
    }, [callState]);

    useEffect(() => {
        if (!user) {
            return
        }
        if (!conversation) {
            return
        }

        const unsubscribe = listen(WINDOW_EVENTS.CALL_EVENTS, async (event: Event<any>) => {
            const eventPayload = event.payload;

            if (conversation.id !== eventPayload.payload.conversationId) {
                console.log('Call event belongs to different conversation.')
            }

            callRealtimeService.handleCallEvent(event, user.id)

            switch (eventPayload.event) {
                case 'call_answered': {
                    if (!activeCall) {
                        return
                    }
                    console.log('Call answered, transitioning to active state');

                    // Get the other participant's user ID
                    const otherParticipant = participants[0];
                    if (!otherParticipant) {
                        throw new Error('No participant found for call');
                    }

                    try {
                        // Set up simple-peer event handlers BEFORE creating peer
                        // This ensures handlers are attached when peer fires events
                        simplePeerService.setEventHandlers({
                            onSignal: async (signalData) => {
                                // Send bundled signal (includes SDP offer + ICE candidates)
                                await sendSignal(
                                    activeCall.id,
                                    'signal',
                                    signalData,
                                    otherParticipant.id
                                );
                            },
                            onStream: (stream) => {
                                // Receive remote stream from peer
                                console.log('Received remote stream');
                                callStore.setRemoteStream(stream);
                                callStore.setCallState('active');
                            },
                            onConnect: () => {
                                console.log('Peer connection established');
                                callStore.setCallState('active');
                            },
                            onError: (error) => {
                                console.error('Peer connection error:', error);
                                setCallError('Connection failed');
                            },
                            onClose: () => {
                                console.log('Peer connection closed');
                            },
                        });

                        const localStream = await navigator.mediaDevices.getUserMedia({
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                            },
                            video: activeCall.callType === 'voice' ? false : {
                                width: 640,
                                height: 480,
                                frameRate: 15,
                            },
                        });

                        // Create simple-peer instance as initiator (caller)
                        simplePeerService.createPeer({
                            initiator: true,
                            stream: localStream,
                        });

                        console.log('Call initiation complete, waiting for answer');
                    } catch (mediaPermissionError: any) {
                        console.error('Media permission error:', mediaPermissionError);

                        // Display error in modal dialog
                        setCallError(mediaPermissionError.message || 'Failed to access microphone');

                        // End the call
                        try {
                            await endCall(activeCall.id);
                        } catch (endCallError) {
                            console.error('Failed to end call after media error:', endCallError);
                        }

                        // Clean up
                        simplePeerService.destroy();
                        callStore.reset();
                    }
                    break
                }

                case 'call_declined': {
                    console.log('Call declined by remote user');

                    // Display "Call declined" message
                    setCallDeclinedMessage('Call declined');

                    // Close WebRTC connection and stop media tracks
                    simplePeerService.destroy();

                    // Update call state to ended
                    callStore.setCallState('ended');

                    // Reset call store and clear message after a short delay to show declined state
                    setTimeout(() => {
                        callStore.reset();
                        setCallDeclinedMessage(null);
                    }, 2000);
                    break
                }

                case 'call_ended': {
                    console.log('Call ended by remote user');

                    // Close WebRTC connection and stop media tracks
                    simplePeerService.destroy();

                    // Update call state to ended
                    callStore.setCallState('ended');

                    // Reset call store after a short delay
                    setTimeout(() => {
                        callStore.reset();
                    }, 1000);
                    break
                }
            }
        })

        return () => {
            unsubscribe.then(fn => fn()).catch(err => console.error(err))
        }
    }, [user, activeCall, participants, conversation])

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

    const handleAudioClick = async () => {
        try {
            // Check if mediaDevices is available (for Tauri/webview compatibility)
            if (!navigator?.mediaDevices?.getUserMedia) {
                console.error('Microphone access not available in this environment');
                return;
            }

            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsRecordingVoice(true);
        } catch (error) {
            console.error('Microphone access denied:', error);
            // Could show error toast here
        }
    };

    const handleSendVoiceClip = async (audioBlob: Blob, duration: number) => {
        if (!conversation?.id || !user) return;

        try {
            const fileName = `voice-${Date.now()}.webm`;
            const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' });

            await sendVoiceClipMutation.mutateAsync({
                audioFile,
                duration,
            });

            setIsRecordingVoice(false);
        } catch (error) {
            console.error('Failed to send voice clip:', error);
        }
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

    const handleSendHandwriting = async (imageData: string) => {
        if (!conversation?.id) return;

        try {
            await sendMessageMutation.mutateAsync({
                conversationId: conversation.id,
                content: 'Handwriting',
                messageType: 'image',
                metadata: {
                    imageData,
                },
            });
        } catch (error) {
            console.error('Failed to send handwriting:', error);
        }
    };

    const handleVoiceCallClick = async () => {
        if (!conversation?.id || !canInitiateCall || !user) {
            return
        }

        try {
            console.log('Requesting media permissions for voice call...');

            const localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            // Store local stream immediately so overlay can show audio
            callStore.setLocalStream(localStream);

            const call = await callInitiateMutation.mutateAsync({
                conversationId: conversation.id,
                callType: 'voice',
            });

            // Update call store with active call and set state to 'connecting' so overlay shows immediately
            callStore.setActiveCall(call);
            callStore.setCallState('connecting');

            // Get the other participant's user ID
            const otherParticipant = participants[0];
            if (!otherParticipant) {
                throw new Error('No participant found for call');
            }

            console.log('Voice call initiated, waiting for answer');
        } catch (error: any) {
            console.error('Failed to initiate voice call:', error);

            // Show error to user
            let errorMessage = 'Failed to initiate call';
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            // Provide better error messages for different failure types
            if (errorMessage.includes('Permission denied') ||
                errorMessage.includes('NotAllowedError') ||
                errorMessage.includes('microphone')) {
                setCallError('Microphone access is required. Please grant permissions and try again.');
            } else if (errorMessage.includes('User is currently on another call') ||
                errorMessage.includes('USER_BUSY')) {
                setCallError('You or your contact is currently on another call. Please try again later.');
            } else {
                setCallError(errorMessage);
            }

            // Clean up on error
            callStore.reset();
        }
    };

    const handleVideoCallClick = async () => {
        if (!conversation?.id || !canInitiateCall || !user) {
            return;
        }

        try {
            const localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: {
                    width: 640,
                    height: 480,
                    frameRate: 15,
                },
            });

            // Store local stream immediately so overlay can show video
            callStore.setLocalStream(localStream);

            // NOW initiate the call via Backend Service API
            const call = await callInitiateMutation.mutateAsync({
                conversationId: conversation.id,
                callType: 'video',
            });

            // Update call store with active call and set state to 'connecting' so overlay shows immediately
            callStore.setActiveCall(call);
            callStore.setCallState('connecting');

            // Get the other participant's user ID
            const otherParticipant = participants[0];
            if (!otherParticipant) {
                throw new Error('No participant found for call');
            }

            console.log('Video call initiated, waiting for answer');
        } catch (error: any) {
            console.error('Failed to initiate video call:', error);

            // Show error to user
            let errorMessage = 'Failed to initiate call';
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            // Provide better error messages for different failure types
            if (errorMessage.includes('Permission denied') ||
                errorMessage.includes('NotAllowedError') ||
                errorMessage.includes('camera') ||
                errorMessage.includes('microphone')) {
                setCallError('Camera and microphone access is required. Please grant permissions and try again.');
            } else if (errorMessage.includes('User is currently on another call') ||
                errorMessage.includes('USER_BUSY')) {
                setCallError('You or your contact is currently on another call. Please try again later.');
            } else {
                setCallError(errorMessage);
            }

            // Stop any media tracks that may have been started
            const localStream = callStore.activeCall ? callStore.activeCall : null;
            if (localStream) {
                callStore.reset();
            }
        }
    };

    const renderInfo = () => {
        if (!participants?.length) {
            return null
        }

        const participant = participants[0]
        if (participant?.presenceStatus === 'online') {
            return null
        }

        if (participant?.presenceStatus === 'offline' || participant?.presenceStatus === 'appear_offline') {
            return (
                <div className="sticky top-[2px] flex items-center border-[1px] border-black gap-1 bg-[#FFFDDA] m-[2px]">
                    <img src="/info-icon.png" className="size-10" />
                    <div className="font-verdana">
                        {displayName} appears to be offline. Messages you send will be delivered when they sign in.
                    </div>
                </div>
            )
        }

        return (
            <div className="sticky top-[2px] flex items-center border-[1px] border-black gap-1 bg-[#FFFDDA] m-[2px]">
                <img src="/info-icon.png" className="size-10" />
                <div className="font-verdana">
                    {displayName} may not reply because his or her status is set to {participant?.presenceStatus}
                </div>
            </div>
        )
    }

    return (
        <div
            className={`window w-full h-screen flex flex-col ${shouldBlink ? 'animate-blink-orange' : ''}`}
        >
            <TitleBar
                title={`${displayName} - Conversation`}
                className={shouldBlink ? 'animate-blink-orange-title' : ''}
            />
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
                                    <div
                                        onClick={canInitiateCall ? handleVideoCallClick : undefined}
                                        className={`whitespace-nowrap box-border hidden min-[346px]:block ${canInitiateCall ? 'cursor-pointer hover:opacity-80' : 'opacity-50 cursor-not-allowed'}`}
                                        title={
                                            !canInitiateCall
                                                ? (hasActiveCall
                                                    ? 'You are already in a call'
                                                    : (isContactBlocked
                                                        ? 'Cannot call blocked contact'
                                                        : 'Contact is offline'))
                                                : 'Start video call'
                                        }
                                    >
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
                                    <div
                                        onClick={canInitiateCall ? handleVoiceCallClick : undefined}
                                        className={`whitespace-nowrap box-border hidden min-[388px]:block ${canInitiateCall ? 'cursor-pointer hover:opacity-80' : 'opacity-50 cursor-not-allowed'}`}
                                        title={
                                            !canInitiateCall
                                                ? (hasActiveCall
                                                    ? 'You are already in a call'
                                                    : (isContactBlocked
                                                        ? 'Cannot call blocked contact'
                                                        : 'Contact is offline'))
                                                : 'Start voice call'
                                        }
                                    >
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
                                        className="space-y-2 overflow-y-auto h-[calc(100vh-306px)] relative"
                                    >
                                        {renderInfo()}
                                        {!isLoadingMessages && hasNextPage && (
                                            <div className="text-center py-2">
                                                <div
                                                    onClick={() => {
                                                        if (isFetchingNextPage) return;
                                                        isLoadingOlderMessagesRef.current = true;
                                                        fetchNextPage();
                                                    }}
                                                    className="px-3 py-1 text-[11px] text-[#31497C] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    style={{ fontFamily: 'Pixelated MS Sans Serif' }}
                                                >
                                                    {isFetchingNextPage ? 'Loading...' : 'Load More Messages'}
                                                </div>
                                            </div>
                                        )}
                                        {messagesData.map((message) => {
                                            const sender = message.sender || conversation?.participants.find((p: User) => p.id === message.senderId);
                                            const isFileTransfer = message.messageType === 'file';
                                            const isImage = message.messageType === 'image';
                                            const isVoice = message.messageType === 'voice';
                                            const isSystem = message.messageType === 'system'

                                            return (
                                                <div key={message.id} className="text-lg px-2 last:pb-2">
                                                    <div className="flex flex-col">
                                                        {
                                                            !isSystem &&
                                                            <div
                                                                style={{
                                                                    fontFamily: 'Pixelated MS Sans Serif'
                                                                }}
                                                            >
                                                                {`${sender?.displayName || 'Unknown'} ${isFileTransfer || isVoice || isImage ? 'sends' : 'says'}`}:
                                                            </div>
                                                        }
                                                        <div className="font-verdana text-black ml-4">
                                                            {
                                                                isVoice && message.metadata?.voiceClipUrl ?
                                                                    <VoiceMessagePlayer
                                                                        voiceClipUrl={message.metadata.voiceClipUrl}
                                                                        duration={message.metadata.duration}
                                                                        senderName={sender?.displayName}
                                                                    /> :
                                                                    isFileTransfer ?
                                                                        <FileTransferRequestMessage
                                                                            message={message}
                                                                        /> :
                                                                        isImage && message.metadata?.imageData ?
                                                                            <img
                                                                                src={message.metadata.imageData}
                                                                                alt="Handwriting"
                                                                                className="max-w-full h-auto"
                                                                            /> :
                                                                            <MessageContent
                                                                                content={message.content}
                                                                                messageType={message.messageType}
                                                                                metadata={message.metadata}
                                                                                caller={sender}
                                                                                conversationId={conversation?.id}
                                                                                initiatorId={message.senderId}
                                                                            />
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {
                                            sendMessageMutation.isPending && (
                                                <div className="!text-lg text-gray-500 italic p-2">
                                                    Sending...
                                                </div>
                                            )
                                        }
                                        {
                                            (isLoadingConversation || isLoadingMessages) && (
                                                <div className="!text-lg text-gray-500 italic p-2">
                                                    Loading...
                                                </div>
                                            )
                                        }
                                        {
                                            conversationError && (
                                                <div className="!text-lg text-red-600 italic p-2">
                                                    {(conversationError as Error)?.message || 'An error occurred'}
                                                </div>
                                            )
                                        }
                                        {
                                            callError && (
                                                <div className="!text-lg text-red-600 italic p-2">
                                                    {callError}
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                                {/* MSN Messenger Avatar */}
                                <div className="hidden min-[470px]:block">
                                    <div className="w-[104px] flex items-center flex-col border border-[#586170] pt-[3px] rounded-lg relative bg-[#dee7f7]">
                                        {
                                            participants[0] ?
                                                participants[0]?.isAiBot ?
                                                    <Avatar name={participants[0]?.displayName || participants[0]?.username} colors={["#0481f6", "#4edfb3", "#ff005b", "#ff7d10", "#ffb238"]} variant="marble" square className='size-[96px] rounded-[7px]' /> :
                                                    <img className="size-[96px] border border-[#586170] rounded-[7px]" src={participants[0]?.displayPictureUrl || '/default-profile-pictures/friendly_dog.png'} alt="" /> :
                                                <div className="size-[96px] bg-gray-300 rounded-[7px]" />
                                        }
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
                                            onClick={handleAudioClick}
                                        >
                                            {
                                                isRecordingVoice ?
                                                    <img src="/audio-recording.png" className="size-8" /> :
                                                    <img src="/audio-clip.png" className="size-8" />
                                            }
                                            Voice Clip
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
                                    {activeTab === 'type' ? (
                                        <div className="flex py-4 px-2">
                                            {isRecordingVoice ? (
                                                <VoiceRecordingInterface
                                                    onSend={handleSendVoiceClip}
                                                    onCancel={() => setIsRecordingVoice(false)}
                                                />
                                            ) : (
                                                <>
                                                    <textarea
                                                        ref={textareaRef}
                                                        value={messageInput}
                                                        onChange={handleInputChange}
                                                        onKeyDown={handleKeyPress}
                                                        placeholder={isContactBlocked ? "Cannot send messages to blocked contact" : "Type a message..."}
                                                        disabled={sendMessageMutation.isPending || isContactBlocked}
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
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex py-4 px-2">
                                            <HandwritingCanvas onSend={handleSendHandwriting} />
                                        </div>
                                    )}

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

                    {/* Call Declined Message - shown when call is declined */}
                    {callDeclinedMessage && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                            <div className="bg-white border-2 border-[#31497C] rounded-lg shadow-lg px-8 py-6">
                                <div className="text-lg font-bold text-[#31497C] text-center">
                                    {callDeclinedMessage}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Audio Call Overlay - shown when in an active audio call */}
                    {hasActiveCall && activeCall?.callType === 'voice' && participants[0] && (
                        <AudioCallOverlay contact={participants[0]} />
                    )}

                    {/* Video Call Overlay - shown when in an active video call */}
                    {hasActiveCall && activeCall?.callType === 'video' && participants[0] && (
                        <VideoCallOverlay contact={participants[0]} />
                    )}
                </div>
            </div>
        </div>
    );
}
