import type { Db } from "@libra/db";
import { getSearchAgent } from "./index.js";
import { createCatalogRequestContext } from "./request-org.js";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export async function generateSearchReply(input: {
  db: Db;
  orgId: string;
  messages: ChatTurn[];
}): Promise<string> {
  const agent = getSearchAgent(input.db);
  const requestContext = createCatalogRequestContext(input.orgId);
  const result = await agent.generate(input.messages, { requestContext });
  return result.text.trim();
}
