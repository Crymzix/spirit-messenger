ALTER POLICY "users_can_view_conversation_participants" ON "conversation_participants" TO public USING (
            EXISTS (
                SELECT 1 FROM conversations
                WHERE conversations.id = conversation_participants.conversation_id
            )
        );