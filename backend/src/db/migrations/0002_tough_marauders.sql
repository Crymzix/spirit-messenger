ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation_participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_conversations" CASCADE;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE POLICY "users_can_view_own_contacts" ON "contacts" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid() OR contact_user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_can_view_conversation_participants" ON "conversation_participants" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants cp
                WHERE cp.conversation_id = conversation_participants.conversation_id
                AND cp.user_id = auth.uid()
            )
        );--> statement-breakpoint
CREATE POLICY "users_can_view_own_conversations" ON "conversations" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = conversations.id
                AND user_id = auth.uid()
            )
        );--> statement-breakpoint
CREATE POLICY "users_can_view_files_in_their_conversations" ON "files" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM messages m
                JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
                WHERE m.id = files.message_id
                AND cp.user_id = auth.uid()
                AND cp.left_at IS NULL
            )
        );--> statement-breakpoint
CREATE POLICY "users_can_view_messages_in_their_conversations" ON "messages" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = messages.conversation_id
                AND user_id = auth.uid()
                AND left_at IS NULL
            )
        );--> statement-breakpoint
CREATE POLICY "users_can_view_own_profile_and_contacts_profiles" ON "users" AS PERMISSIVE FOR SELECT TO public USING (
            id = auth.uid() OR
            is_ai_bot = TRUE OR
            EXISTS (
                SELECT 1 FROM contacts
                WHERE (user_id = auth.uid() AND contact_user_id = users.id AND status = 'accepted')
                   OR (contact_user_id = auth.uid() AND user_id = users.id AND status = 'accepted')
            )
        );