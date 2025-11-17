ALTER POLICY "users_can_view_own_group_memberships" ON "contact_group_memberships" TO public USING (
            EXISTS (
                SELECT 1 FROM contact_groups
                WHERE contact_groups.id = contact_group_memberships.group_id
                AND contact_groups.user_id = (select auth.uid())
            )
        );--> statement-breakpoint
ALTER POLICY "users_can_view_own_contact_groups" ON "contact_groups" TO public USING (user_id = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "users_can_view_own_contacts" ON "contacts" TO public USING (user_id = (select auth.uid()) OR contact_user_id = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "users_can_view_conversation_participants" ON "conversation_participants" TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants cp
                WHERE cp.conversation_id = conversation_participants.conversation_id
                AND cp.user_id = (select auth.uid())
            )
        );--> statement-breakpoint
ALTER POLICY "users_can_view_own_conversations" ON "conversations" TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = conversations.id
                AND user_id = (select auth.uid())
            )
        );--> statement-breakpoint
ALTER POLICY "users_can_view_files_in_their_conversations" ON "files" TO public USING (
            EXISTS (
                SELECT 1 FROM messages m
                JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
                WHERE m.id = files.message_id
                AND cp.user_id = (select auth.uid())
                AND cp.left_at IS NULL
            )
        );--> statement-breakpoint
ALTER POLICY "users_can_receive_realtime_messages" ON "messages" TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = messages.conversation_id
                AND user_id = (select auth.uid())
                AND left_at IS NULL
            )
        );--> statement-breakpoint
ALTER POLICY "users_can_view_own_profile_pictures" ON "user_profile_pictures" TO public USING (user_id = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "users_can_view_own_profile_and_contacts_profiles" ON "users" TO public USING (
            id = (select auth.uid()) OR
            is_ai_bot = TRUE OR
            EXISTS (
                SELECT 1 FROM contacts
                WHERE (user_id = (select auth.uid()) AND contact_user_id = users.id AND status = 'accepted')
                   OR (contact_user_id = (select auth.uid()) AND user_id = users.id AND status = 'accepted')
            )
        );