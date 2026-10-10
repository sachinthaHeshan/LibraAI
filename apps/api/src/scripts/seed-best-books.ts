import { bookApiColumns, books, createDb, type Db } from "@libra/db";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { env } from "../env.js";
import { getGoogleApiKey } from "../mastra/google.js";
import { reindexBooks } from "../mastra/rag/index-book.js";
import { selectOrganization } from "./seed-prompt.js";

type BestBook = {
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  publishedYear: number | null;
  genre: string;
  description: string;
};

/** 300 titles across 30 genres, picked from the Goodreads "Best Books Ever" dataset. */
const BEST_BOOKS: BestBook[] = JSON.parse(
  readFileSync(new URL("./data/best-books.json", import.meta.url), "utf8"),
);

async function seedBestBooks(db: Db, organizationId: string) {
  return db
    .insert(books)
    .values(
      BEST_BOOKS.map((book) => ({
        ...book,
        organizationId,
        availableCopies: book.totalCopies,
      })),
    )
    .onConflictDoUpdate({
      target: [books.organizationId, books.isbn],
      set: {
        title: sql`excluded.title`,
        author: sql`excluded.author`,
        genre: sql`excluded.genre`,
        description: sql`excluded.description`,
        publishedYear: sql`excluded.published_year`,
        updatedAt: new Date(),
      },
    })
    .returning(bookApiColumns);
}

const db = createDb(env.DATABASE_URL);
const { organizationId, orgName } = await selectOrganization(db, {
  alwaysPrompt: true,
  command: "just seed-books",
});

const seeded = await seedBestBooks(db, organizationId);
console.log(`Upserted ${seeded.length} books in ${orgName}`);

if (!getGoogleApiKey()) {
  console.warn(
    "GOOGLE_GENERATIVE_AI_API_KEY is not set — skipped embeddings. Set it and run `just index-books`.",
  );
  process.exit(0);
}

console.log(`Embedding ${seeded.length} books…`);
const result = await reindexBooks(seeded);
console.log(
  `Indexed ${result.indexed} of ${seeded.length} books (${result.failed} failed).`,
);
process.exit(result.failed > 0 ? 1 : 0);
