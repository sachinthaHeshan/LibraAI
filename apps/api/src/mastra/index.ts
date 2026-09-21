import { Mastra } from "@mastra/core";
import type { Db } from "@libra/db";
import { createSearchAgent } from "./agents/search-agent.js";
import { SEARCH_AGENT_ID } from "./constants.js";
import { getPgVector } from "./vector.js";

let mastra: Mastra | undefined;
let searchAgent: ReturnType<typeof createSearchAgent> | undefined;

export function getMastra(db: Db) {
  if (!mastra || !searchAgent) {
    searchAgent = createSearchAgent(db);
    mastra = new Mastra({
      agents: { searchAgent },
      vectors: { pgVector: getPgVector() },
      logger: false,
    });
  }
  return { mastra, searchAgent };
}

export function getSearchAgent(db: Db) {
  return getMastra(db).searchAgent;
}

export { SEARCH_AGENT_ID };
