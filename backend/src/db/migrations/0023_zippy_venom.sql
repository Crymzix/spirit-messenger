CREATE TABLE "bot_personal_message_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_user_id" uuid NOT NULL,
	"old_message" text,
	"new_message" text NOT NULL,
	"mood_score" double precision NOT NULL,
	"mood_state" varchar(20) NOT NULL,
	"context_summary" text,
	"update_reason" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bot_configs" ADD COLUMN "personal_message_auto_update_enabled" boolean;--> statement-breakpoint
ALTER TABLE "bot_configs" ADD COLUMN "personal_message_update_interval_ms" bigint;--> statement-breakpoint
ALTER TABLE "bot_personal_message_updates" ADD CONSTRAINT "bot_personal_message_updates_bot_user_id_users_id_fk" FOREIGN KEY ("bot_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bot_personal_message_updates_bot_user_id" ON "bot_personal_message_updates" USING btree ("bot_user_id");--> statement-breakpoint
CREATE INDEX "idx_bot_personal_message_updates_created_at" ON "bot_personal_message_updates" USING btree ("created_at" DESC NULLS LAST);