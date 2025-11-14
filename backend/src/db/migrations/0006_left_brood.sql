CREATE TABLE "contact_group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contact_group_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contact_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contact_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_group_memberships" ADD CONSTRAINT "contact_group_memberships_group_id_contact_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."contact_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_group_memberships" ADD CONSTRAINT "contact_group_memberships_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_groups" ADD CONSTRAINT "contact_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contact_group_memberships_group_id" ON "contact_group_memberships" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_contact_group_memberships_contact_id" ON "contact_group_memberships" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_contact_groups_user_id" ON "contact_groups" USING btree ("user_id","display_order");--> statement-breakpoint
CREATE POLICY "users_can_view_own_group_memberships" ON "contact_group_memberships" AS PERMISSIVE FOR SELECT TO public USING (
            EXISTS (
                SELECT 1 FROM contact_groups
                WHERE contact_groups.id = contact_group_memberships.group_id
                AND contact_groups.user_id = auth.uid()
            )
        );--> statement-breakpoint
CREATE POLICY "users_can_view_own_contact_groups" ON "contact_groups" AS PERMISSIVE FOR SELECT TO public USING (user_id = auth.uid());