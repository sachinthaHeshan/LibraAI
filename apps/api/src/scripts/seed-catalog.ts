import { books, createDb, type Db } from "@libra/db";
import { env } from "../env.js";
import { indexBookBestEffort } from "../mastra/rag/index-book.js";
import { SAMPLE_BOOKS } from "./sample-books.js";
import { selectOrganization } from "./seed-prompt.js";

async function seedSampleCatalog(db: Db, organizationId: string) {
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

const db = createDb(env.DATABASE_URL);
const { organizationId, orgName } = await selectOrganization(db);
const inserted = await seedSampleCatalog(db, organizationId);

if (inserted > 0) {
  console.log(`Seeded ${inserted} sample catalog titles in ${orgName}`);
} else {
  console.log(`Sample catalog already present for ${orgName}`);
}

process.exit(0);
