-- Custom SQL migration file, put your code below! --
-- Enable Realtime for tables that need real-time subscriptions
-- This allows Supabase to broadcast changes to connected clients

-- Enable replica identity FULL to receive old values on UPDATE/DELETE
-- This is required for filtered subscriptions to work properly
ALTER TABLE "contacts" REPLICA IDENTITY FULL;
ALTER TABLE "users" REPLICA IDENTITY FULL;
ALTER TABLE "messages" REPLICA IDENTITY FULL;
ALTER TABLE "conversation_participants" REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
-- This enables real-time broadcasting of INSERT, UPDATE, DELETE events
ALTER PUBLICATION supabase_realtime ADD TABLE "contacts";
ALTER PUBLICATION supabase_realtime ADD TABLE "users";
ALTER PUBLICATION supabase_realtime ADD TABLE "messages";
ALTER PUBLICATION supabase_realtime ADD TABLE "conversation_participants";
