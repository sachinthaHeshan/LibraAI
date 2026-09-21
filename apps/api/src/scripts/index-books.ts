import { books, createDb } from "@libra/db";
import { env } from "../env.js";
import { isAiConfigured } from "../mastra/google.js";
import { reindexBooks } from "../mastra/rag/index-book.js";

if (!isAiConfigured()) {
  console.error(
    "Set GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY) before indexing books.",
  );
  process.exit(1);
}

const db = createDb(env.DATABASE_URL);
const catalog = await db.select().from(books);

if (catalog.length === 0) {
  console.log("No books found. Add books or run `just seed` first.");
  process.exit(0);
}

const result = await reindexBooks(catalog);
console.log(
  `Indexed ${result.indexed} of ${catalog.length} books (${result.failed} failed).`,
);
process.exit(result.failed > 0 ? 1 : 0);
