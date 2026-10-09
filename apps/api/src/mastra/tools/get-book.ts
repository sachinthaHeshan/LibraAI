import { books, type Db } from "@libra/db";
import { and, eq } from "drizzle-orm";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { requireOrgIdFromContext } from "../request-org.js";

export function createGetBookTool(db: Db) {
  return createTool({
    id: "get-book",
    description:
      "Get live catalog details for a book by id, including available copies. Use after searchBooks to confirm stock before recommending a title.",
    inputSchema: z.object({
      bookId: z.string().uuid().describe("Catalog book id from search results"),
    }),
    execute: async ({ bookId }, context) => {
      const orgId = requireOrgIdFromContext(context?.requestContext);
      const book = await db.query.books.findFirst({
        where: and(eq(books.id, bookId), eq(books.organizationId, orgId)),
      });

      if (!book) {
        return { found: false as const };
      }

      return {
        found: true as const,
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          genre: book.genre,
          description: book.description,
          publishedYear: book.publishedYear,
          totalCopies: book.totalCopies,
          availableCopies: book.availableCopies,
        },
      };
    },
  });
}
