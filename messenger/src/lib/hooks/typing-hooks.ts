import { useEffect, useState, useCallback } from 'react';
import { typingService, TypingUser } from '../services/typing-service';
import { useUser } from '../index';

/**
 * Hook to manage typing indicators for a conversation
 */
export function useTypingIndicator(conversationId: string | null) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const { data: currentUser } = useUser();

    // Subscribe to typing updates
    useEffect(() => {
        if (!conversationId || !currentUser) {
            return;
        }

        const unsubscribe = typingService.subscribeToTyping(
            conversationId,
            currentUser.id,
            (users) => {
                setTypingUsers(users);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [conversationId, currentUser]);

    // Function to set typing status
    const setTyping = useCallback(
        async (isTyping: boolean) => {
            if (!conversationId || !currentUser) {
                return;
            }

            await typingService.setTyping(conversationId, currentUser.id, isTyping);
        },
        [conversationId, currentUser]
    );

    return {
        typingUsers,
        setTyping,
    };
}
