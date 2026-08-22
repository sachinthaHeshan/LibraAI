ALTER TABLE "admins" ADD COLUMN "first_name" text NOT NULL DEFAULT 'Admin';--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "last_name" text NOT NULL DEFAULT 'User';--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "first_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "last_name" DROP DEFAULT;