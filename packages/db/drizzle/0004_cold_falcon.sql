ALTER TABLE "books" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(author, '')), 'A')
  || setweight(to_tsvector('simple', coalesce(isbn, '')), 'A')
  || setweight(to_tsvector('english', coalesce(genre, '')), 'B')
  || setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;--> statement-breakpoint
CREATE INDEX "books_search_vector_idx" ON "books" USING gin ("search_vector");