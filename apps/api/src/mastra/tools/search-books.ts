import { type Db } from "@libra/db";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { requireOrgIdFromContext } from "../request-org.js";
import { searchCatalogBooks } from "../search-catalog.js";

export function createSearchBooksTool(db: Db) {
  return createTool({
    id: "search-books",
    description:
      "Search this library's book catalog by title, author, ISBN, genre, topic, or natural-language questions. Pass the extracted title, author, ISBN, or topic — not the full user sentence.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe(
          "Short title, author, ISBN, or topic query. Do not include filler like 'do we have' or 'please recommend'.",
        ),
    }),
    execute: async ({ query }, context) => {
      const orgId = requireOrgIdFromContext(
        context?.requestContext as { get(key: string): unknown } | undefined,
      );
      return searchCatalogBooks({ db, orgId, query });
    },
  });
}
