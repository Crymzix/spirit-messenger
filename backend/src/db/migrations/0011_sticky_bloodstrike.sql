DROP POLICY "users_can_receive_realtime_messages" ON "messages" CASCADE;--> statement-breakpoint
CREATE POLICY "users_can_view_messages_in_their_conversations" ON "messages" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = messages.conversation_id
                AND user_id = (select auth.uid())
                AND left_at IS NULL
            )
        );