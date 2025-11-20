CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_user_id" ON "ai_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_conversations_updated_at" ON "ai_conversations" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_messages_conversation_id" ON "ai_messages" USING btree ("conversation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_messages_created_at" ON "ai_messages" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "users_can_view_own_ai_conversations" ON "ai_conversations" AS PERMISSIVE FOR SELECT TO public USING (user_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users_can_view_own_ai_messages" ON "ai_messages" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM ai_conversations
                WHERE ai_conversations.id = ai_messages.conversation_id
                AND ai_conversations.user_id = (select auth.uid())
            )
        );