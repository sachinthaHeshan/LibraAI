import type { Db } from "@libra/db";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { requireOrgId } from "../lib/org.js";
import { isAiConfigured } from "../mastra/google.js";
import { generateSearchReply } from "../mastra/run-chat.js";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const chatBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
});

export function createAiChatRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post("/ai/chat", async (request) => {
      const orgId = requireOrgId(request);
      const { messages } = chatBodySchema.parse(request.body);

      if (!isAiConfigured()) {
        throw new AppError(503, "AI search is not configured");
      }

      const { reply, books } = await generateSearchReply({ db, orgId, messages });
      return { reply, books };
    });
  };
}
