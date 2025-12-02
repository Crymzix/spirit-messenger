CREATE TABLE "orchestrator_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"decision" varchar(50) NOT NULL,
	"confidence" double precision NOT NULL,
	"engagement_score" double precision NOT NULL,
	"reasoning" text,
	"signals" jsonb,
	"tone_adjustment" varchar(50),
	"outcome" varchar(50),
	"outcome_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_engagement_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bot_user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"average_response_time" bigint,
	"average_message_length" double precision,
	"response_rate" double precision,
	"recent_engagement_trend" varchar(20),
	"one_word_reply_count" integer DEFAULT 0,
	"total_messages_exchanged" integer DEFAULT 0,
	"last_calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "orchestrator_decisions" ADD CONSTRAINT "orchestrator_decisions_bot_user_id_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orchestrator_decisions" ADD CONSTRAINT "orchestrator_decisions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_engagement_profiles" ADD CONSTRAINT "user_engagement_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_engagement_profiles" ADD CONSTRAINT "user_engagement_profiles_bot_user_id_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_engagement_profiles" ADD CONSTRAINT "user_engagement_profiles_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_orchestrator_decisions_bot_conversation" ON "orchestrator_decisions" USING btree ("bot_user_id","conversation_id");--> statement-breakpoint
CREATE INDEX "idx_orchestrator_decisions_outcome" ON "orchestrator_decisions" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "idx_orchestrator_decisions_created_at" ON "orchestrator_decisions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_user_engagement_profiles_user" ON "user_engagement_profiles" USING btree ("user_id","bot_user_id");--> statement-breakpoint
CREATE INDEX "idx_user_engagement_profiles_updated" ON "user_engagement_profiles" USING btree ("updated_at" DESC NULLS LAST);