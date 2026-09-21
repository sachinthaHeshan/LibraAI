import { books, type Db } from "@libra/db";
import { SAMPLE_BOOKS } from "./sample-books.js";
import { indexBookBestEffort } from "../mastra/rag/index-book.js";

export async function seedSampleCatalog(db: Db, organizationId: string) {
  let inserted = 0;

  for (const sample of SAMPLE_BOOKS) {
    const [book] = await db
      .insert(books)
      .values({
        ...sample,
        organizationId,
        availableCopies: sample.totalCopies,
      })
      .onConflictDoNothing()
      .returning();

    if (book) {
      inserted += 1;
      await indexBookBestEffort(book);
    }
  }

  return inserted;
}
