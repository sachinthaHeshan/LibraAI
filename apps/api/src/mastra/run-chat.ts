import { books, type Db } from "@libra/db";
import { and, eq, inArray } from "drizzle-orm";
import { extractBookIdsFromToolResults, type ChatBook } from "./chat-books.js";
import { getSearchAgent } from "./index.js";
import { createCatalogRequestContext } from "./request-org.js";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type SearchReply = {
  reply: string;
  books: ChatBook[];
};

async function loadChatBooks(db: Db, orgId: string, ids: string[]): Promise<ChatBook[]> {
  if (ids.length === 0) return [];

  const rows = await db.query.books.findMany({
    where: and(eq(books.organizationId, orgId), inArray(books.id, ids)),
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids.flatMap((id) => {
    const book = byId.get(id);
    if (!book) return [];
    return [
      {
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
    ];
  });
}

export async function generateSearchReply(input: {
  db: Db;
  orgId: string;
  messages: ChatTurn[];
}): Promise<SearchReply> {
  const agent = getSearchAgent(input.db);
  const requestContext = createCatalogRequestContext(input.orgId);
  const result = await agent.generate(input.messages, { requestContext });
  const toolResults = [
    ...((result.toolResults ?? []) as Array<{ payload?: unknown; result?: unknown }>),
    ...((result.steps ?? []).flatMap((step) => step.toolResults ?? []) as Array<{
      payload?: unknown;
      result?: unknown;
    }>),
  ];
  const booksFound = await loadChatBooks(
    input.db,
    input.orgId,
    extractBookIdsFromToolResults(toolResults),
  );

  return {
    reply: result.text.trim(),
    books: booksFound,
  };
}
