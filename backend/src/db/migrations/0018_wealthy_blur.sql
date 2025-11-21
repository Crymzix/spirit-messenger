CREATE TABLE "bot_action_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_user_id" uuid NOT NULL,
	"conversation_id" uuid,
	"action_type" varchar(50) NOT NULL,
	"action_metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bot_autonomous_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_user_id" uuid NOT NULL,
	"last_autonomous_message_at" timestamp,
	"next_scheduled_check" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"personality_template" varchar(50) NOT NULL,
	"custom_personality_config" jsonb,
	"response_delay_min" integer DEFAULT 1000,
	"response_delay_max" integer DEFAULT 5000,
	"typing_speed" integer DEFAULT 50,
	"autonomous_messaging_enabled" boolean DEFAULT true,
	"autonomous_interval_min" integer DEFAULT 300000,
	"autonomous_interval_max" integer DEFAULT 3600000,
	"ignore_message_probability" double precision DEFAULT 0.1,
	"nudge_probability" double precision DEFAULT 0.05,
	"voice_clip_probability" double precision DEFAULT 0.02,
	"emoticon_usage_frequency" double precision DEFAULT 0.3,
	"web_search_enabled" boolean DEFAULT true,
	"voice_config" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bot_conversation_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"context_history" jsonb,
	"conversation_summary" text,
	"last_interaction_at" timestamp,
	"interaction_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bot_action_logs" ADD CONSTRAINT "bot_action_logs_bot_user_id_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_action_logs" ADD CONSTRAINT "bot_action_logs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_autonomous_schedules" ADD CONSTRAINT "bot_autonomous_schedules_bot_user_id_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_configs" ADD CONSTRAINT "bot_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_conversation_contexts" ADD CONSTRAINT "bot_conversation_contexts_bot_user_id_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_conversation_contexts" ADD CONSTRAINT "bot_conversation_contexts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bot_action_logs_bot_user_id" ON "bot_action_logs" USING btree ("bot_user_id");--> statement-breakpoint
CREATE INDEX "idx_bot_action_logs_conversation_id" ON "bot_action_logs" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_bot_action_logs_action_type" ON "bot_action_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "idx_bot_action_logs_created_at" ON "bot_action_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_bot_autonomous_schedules_bot_user_id" ON "bot_autonomous_schedules" USING btree ("bot_user_id");--> statement-breakpoint
CREATE INDEX "idx_bot_autonomous_schedules_next_check" ON "bot_autonomous_schedules" USING btree ("next_scheduled_check");--> statement-breakpoint
CREATE INDEX "idx_bot_configs_user_id" ON "bot_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_bot_conversation_contexts_bot_conversation" ON "bot_conversation_contexts" USING btree ("bot_user_id","conversation_id");