import type { Db } from "@libra/db";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { accountRole, requireOrgId } from "../lib/org.js";
import { isAiConfigured } from "../mastra/google.js";
import { generateChatReply } from "../mastra/run-chat.js";

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

      const memberId = accountRole(request) === "member" ? request.user.sub : undefined;
      return generateChatReply({ db, orgId, memberId, messages });
    });
  };
}
