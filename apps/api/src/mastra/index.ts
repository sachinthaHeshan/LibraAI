import { createDb, type Db } from "@libra/db";
import { Mastra } from "@mastra/core";
import { env } from "../env.js";
import { createSearchAgent } from "./agents/search-agent.js";
import { SEARCH_AGENT_ID } from "./constants.js";
import { getPgVector } from "./vector.js";

let cachedMastra: Mastra | undefined;
let searchAgent: ReturnType<typeof createSearchAgent> | undefined;

export function getMastra(db: Db) {
  if (!cachedMastra || !searchAgent) {
    searchAgent = createSearchAgent(db);
    cachedMastra = new Mastra({
      agents: { searchAgent },
      vectors: { pgVector: getPgVector() },
      logger: false,
    });
  }
  return { mastra: cachedMastra, searchAgent };
}

export function getSearchAgent(db: Db) {
  return getMastra(db).searchAgent;
}

/** Named export required by `mastra dev` / Studio. Skip in tests to avoid extra connections. */
export const mastra = (
  process.env.VITEST || process.env.NODE_ENV === "test"
    ? undefined
    : getMastra(createDb(env.DATABASE_URL)).mastra
) as Mastra;

export { SEARCH_AGENT_ID };
