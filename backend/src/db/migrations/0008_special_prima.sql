CREATE POLICY "users_can_receive_realtime_messages" ON "messages" AS PERMISSIVE FOR ALL TO "authenticated" USING (
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = messages.conversation_id
                AND user_id = auth.uid()
                AND left_at IS NULL
            )
        );