import { type Db } from "@libra/db";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { requireOrgIdFromContext } from "../request-org.js";
import { searchCatalogBooks } from "../search-catalog.js";

export function createSearchBooksTool(db: Db) {
  return createTool({
    id: "search-books",
    description:
      "Search this library's book catalog by title, author, ISBN, genre, topic, or natural-language questions.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe("Natural language search query about books"),
    }),
    execute: async ({ query }, context) => {
      const orgId = requireOrgIdFromContext(
        context?.requestContext as { get(key: string): unknown } | undefined,
      );
      return searchCatalogBooks({ db, orgId, query });
    },
  });
}
