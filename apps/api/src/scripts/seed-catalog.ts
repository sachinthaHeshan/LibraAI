import { bookApiColumns, books, createDb, type Db } from "@libra/db";
import { env } from "../env.js";
import { indexBookBestEffort } from "../mastra/rag/index-book.js";
import { SAMPLE_BOOKS } from "./sample-books.js";
import { selectOrganization } from "./seed-prompt.js";

async function seedSampleCatalog(db: Db, organizationId: string) {
  let upserted = 0;

  for (const sample of SAMPLE_BOOKS) {
    const [book] = await db
      .insert(books)
      .values({
        ...sample,
        organizationId,
        availableCopies: sample.totalCopies,
      })
      .onConflictDoUpdate({
        target: [books.organizationId, books.isbn],
        set: {
          title: sample.title,
          author: sample.author,
          genre: sample.genre,
          description: sample.description,
          publishedYear: sample.publishedYear,
          updatedAt: new Date(),
        },
      })
      .returning(bookApiColumns);

    if (book) {
      upserted += 1;
      await indexBookBestEffort(book);
    }
  }

  return upserted;
}

const db = createDb(env.DATABASE_URL);
const { organizationId, orgName } = await selectOrganization(db);
const upserted = await seedSampleCatalog(db, organizationId);

console.log(`Upserted ${upserted} sample catalog titles in ${orgName}`);
process.exit(0);
