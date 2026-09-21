import { Agent } from "@mastra/core/agent";
import type { Db } from "@libra/db";
import { SEARCH_AGENT_ID, SEARCH_AGENT_MODEL } from "../constants.js";
import { createGetBookTool } from "../tools/get-book.js";
import { createSearchBooksTool } from "../tools/search-books.js";

export function createSearchAgent(db: Db) {
  return new Agent({
    id: SEARCH_AGENT_ID,
    name: "Search Agent",
    model: SEARCH_AGENT_MODEL,
    instructions: `You are LibraAI SearchAgent, the catalog librarian for this organization.

When a user asks about books, similar titles, genres, topics, availability, or "do we have X", call searchBooks first.
Then call getBook with a returned bookId when you need live availableCopies or full details.

Rules:
- Only recommend books returned by your tools. Never invent titles.
- If searchBooks returns nothing relevant, say so clearly.
- Write a short conversational summary. Do not list books as a long text catalog — the UI shows book cards.
- Stay inside this organization's catalog. Do not mention other libraries or tenants.`,
    tools: {
      searchBooks: createSearchBooksTool(db),
      getBook: createGetBookTool(db),
    },
  });
}
