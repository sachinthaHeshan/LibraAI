CREATE TABLE "recommendation_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"summary" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_items" (
	"batch_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "recommendation_items_batch_id_book_id_pk" PRIMARY KEY("batch_id","book_id")
);
--> statement-breakpoint
ALTER TABLE "recommendation_batches" ADD CONSTRAINT "recommendation_batches_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_batch_id_recommendation_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."recommendation_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendation_batches_member_generated_idx" ON "recommendation_batches" USING btree ("member_id","generated_at");