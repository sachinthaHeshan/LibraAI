import { createDb, type Db } from "@libra/db";
import { Mastra } from "@mastra/core";
import { MastraStorageExporter, Observability } from "@mastra/observability";
import { env } from "../env.js";
import { createBorrowAgent } from "./agents/borrow-agent.js";
import { createOrchestratorAgent } from "./agents/orchestrator-agent.js";
import { createRecommendationAgent } from "./agents/recommendation-agent.js";
import { createSearchAgent } from "./agents/search-agent.js";
import {
  BORROW_AGENT_ID,
  ORCHESTRATOR_AGENT_ID,
  RECOMMENDATION_AGENT_ID,
  SEARCH_AGENT_ID,
} from "./constants.js";
import { getMastraStorage } from "./storage.js";
import { getPgVector } from "./vector.js";

let cachedMastra: Mastra | undefined;
let orchestratorAgent: ReturnType<typeof createOrchestratorAgent> | undefined;
let recommendationAgent: ReturnType<typeof createRecommendationAgent> | undefined;

export function getMastra(db: Db) {
  if (!cachedMastra || !orchestratorAgent || !recommendationAgent) {
    const searchAgent = createSearchAgent(db);
    const borrowAgent = createBorrowAgent(db);
    recommendationAgent = createRecommendationAgent(db);
    orchestratorAgent = createOrchestratorAgent({ searchAgent, borrowAgent, recommendationAgent });
    cachedMastra = new Mastra({
      agents: { orchestratorAgent, searchAgent, borrowAgent, recommendationAgent },
      vectors: { pgVector: getPgVector() },
      storage: getMastraStorage(),
      // Traces every agent run into storage so Studio's Observability tab shows frontend chats.
      observability: new Observability({
        configs: {
          default: {
            serviceName: "libra-api",
            exporters: [new MastraStorageExporter()],
          },
        },
      }),
      logger: false,
    });
  }
  return { mastra: cachedMastra, orchestratorAgent, recommendationAgent };
}

export function getOrchestratorAgent(db: Db) {
  return getMastra(db).orchestratorAgent;
}

export function getRecommendationAgent(db: Db) {
  return getMastra(db).recommendationAgent;
}

/** Named export required by `mastra dev` / Studio. Skip in tests to avoid extra connections. */
export const mastra = (
  process.env.VITEST || process.env.NODE_ENV === "test"
    ? undefined
    : getMastra(createDb(env.DATABASE_URL)).mastra
) as Mastra;

export { BORROW_AGENT_ID, ORCHESTRATOR_AGENT_ID, RECOMMENDATION_AGENT_ID, SEARCH_AGENT_ID };
