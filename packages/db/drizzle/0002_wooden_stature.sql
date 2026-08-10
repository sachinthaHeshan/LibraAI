CREATE TYPE "public"."organization_plan" AS ENUM('starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"plan" "organization_plan" DEFAULT 'pro' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" DROP CONSTRAINT "books_isbn_unique";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_email_unique";--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
INSERT INTO "organizations" ("id", "name", "plan") VALUES ('00000000-0000-4000-8000-000000000001', 'Default Library', 'pro');--> statement-breakpoint
UPDATE "admins" SET "organization_id" = '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
UPDATE "books" SET "organization_id" = '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
UPDATE "members" SET "organization_id" = '00000000-0000-4000-8000-000000000001';--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "books_organization_id_isbn_uidx" ON "books" USING btree ("organization_id","isbn");--> statement-breakpoint
CREATE UNIQUE INDEX "members_organization_id_email_uidx" ON "members" USING btree ("organization_id","email");