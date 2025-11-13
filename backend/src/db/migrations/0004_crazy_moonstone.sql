CREATE TABLE "user_profile_pictures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"picture_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_profile_pictures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_profile_pictures" ADD CONSTRAINT "user_profile_pictures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_profile_pictures_user_id" ON "user_profile_pictures" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_profile_pictures_uploaded_at" ON "user_profile_pictures" USING btree ("uploaded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "users_can_view_own_profile_pictures" ON "user_profile_pictures" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid());