import { createTool } from "@mastra/core/tools";
import { createVectorQueryTool } from "@mastra/rag";
import { z } from "zod";
import {
  BOOK_EMBEDDINGS_INDEX,
  SEARCH_TOP_K,
} from "../constants.js";
import { bookEmbeddingProviderOptions, getBookEmbeddingModel } from "../embedder.js";
import {
  catalogVectorFilter,
  requireOrgIdFromContext,
} from "../request-org.js";
import { getPgVector } from "../vector.js";

export function createSearchBooksTool() {
  const vectorQueryTool = createVectorQueryTool({
    id: "book-vector-query",
    description:
      "Semantic search over this library's book catalog. Use for finding books by topic, similar titles, genre, plot, or natural-language questions.",
    indexName: BOOK_EMBEDDINGS_INDEX,
    model: getBookEmbeddingModel(),
    vectorStore: async () => getPgVector(),
    enableFilter: true,
    providerOptions: bookEmbeddingProviderOptions,
    databaseConfig: {
      pgvector: { minScore: 0.25 },
    },
  });

  return createTool({
    id: "search-books",
    description:
      "Semantic search over this library's book catalog. Use for finding books by topic, similar titles, genre, plot, or natural-language questions about titles the library might hold.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe("Natural language search query about books"),
    }),
    execute: async ({ query }, context) => {
      const orgId = requireOrgIdFromContext(context?.requestContext);
      const filter = catalogVectorFilter(orgId);
      context?.requestContext?.setRaw("filter", filter);
      context?.requestContext?.setRaw("topK", SEARCH_TOP_K);

      const execute = vectorQueryTool.execute;
      if (!execute) {
        throw new Error("Vector query tool is not executable");
      }

      return execute(
        {
          queryText: query,
          topK: SEARCH_TOP_K,
          filter: JSON.stringify(filter),
        },
        context,
      );
    },
  });
}
