CREATE TYPE "public"."ai_audit_outcome" AS ENUM('completed', 'refused', 'rate_limited', 'failed');--> statement-breakpoint
CREATE TABLE "ai_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"outcome" "ai_audit_outcome" NOT NULL,
	"refusal_code" text,
	"agent_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"tool_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"input_digest" text NOT NULL,
	"input_chars" integer NOT NULL,
	"pii_redactions" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_audit_events_org_created_idx" ON "ai_audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "ai_audit_events_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ai_audit_events is append-only';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "ai_audit_events_no_update_delete"
  BEFORE UPDATE OR DELETE ON "ai_audit_events"
  FOR EACH ROW EXECUTE FUNCTION "ai_audit_events_append_only"();
