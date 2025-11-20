CREATE TABLE "file_transfer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"file_size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"message_id" uuid,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "file_transfer_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "transfer_request_id" uuid;--> statement-breakpoint
ALTER TABLE "file_transfer_requests" ADD CONSTRAINT "file_transfer_requests_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_transfer_requests" ADD CONSTRAINT "file_transfer_requests_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_transfer_requests" ADD CONSTRAINT "file_transfer_requests_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_transfer_requests" ADD CONSTRAINT "file_transfer_requests_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_file_transfer_requests_conversation_id" ON "file_transfer_requests" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_file_transfer_requests_sender_id" ON "file_transfer_requests" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_file_transfer_requests_receiver_id" ON "file_transfer_requests" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "idx_file_transfer_requests_status" ON "file_transfer_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_file_transfer_requests_expires_at" ON "file_transfer_requests" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_transfer_request_id_file_transfer_requests_id_fk" FOREIGN KEY ("transfer_request_id") REFERENCES "public"."file_transfer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_files_transfer_request_id" ON "files" USING btree ("transfer_request_id");--> statement-breakpoint
CREATE POLICY "users_can_view_file_transfer_requests_in_their_conversations" ON "file_transfer_requests" AS PERMISSIVE FOR SELECT TO public USING (
            sender_id = (select auth.uid()) OR receiver_id = (select auth.uid())
        );