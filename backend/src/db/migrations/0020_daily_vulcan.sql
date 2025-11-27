CREATE TABLE "call_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "call_participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"initiator_id" uuid NOT NULL,
	"call_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'ringing' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"error_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_call_participants_call_id" ON "call_participants" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "idx_call_participants_user_id" ON "call_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_calls_conversation_id_created_at" ON "calls" USING btree ("conversation_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_calls_status" ON "calls" USING btree ("status");--> statement-breakpoint
CREATE POLICY "users_can_view_call_participants" ON "call_participants" AS PERMISSIVE FOR SELECT TO public USING (
            user_id = (select auth.uid()) OR
            EXISTS (
                SELECT 1 FROM calls
                JOIN conversation_participants cp ON cp.conversation_id = calls.conversation_id
                WHERE calls.id = call_participants.call_id
                AND cp.user_id = (select auth.uid())
            )
        );--> statement-breakpoint
CREATE POLICY "users_can_view_calls_in_their_conversations" ON "calls" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = calls.conversation_id
                AND user_id = (select auth.uid())
            )
        );