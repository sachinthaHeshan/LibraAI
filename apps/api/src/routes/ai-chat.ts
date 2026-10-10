import type { Db } from "@libra/db";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { accountRole, requireOrgId } from "../lib/org.js";
import { isAiConfigured } from "../mastra/google.js";
import { generateChatReply } from "../mastra/run-chat.js";
import { listAiAuditEvents, recordAiAuditEvent } from "../safety/audit.js";
import {
  REFUSAL_MESSAGES,
  checkRequestPolicy,
  redactPii,
  sanitizeUserText,
  type RefusalCode,
} from "../safety/policy.js";
import { createRateLimiter, type RateLimiter } from "../safety/rate-limit.js";

/** Version of the `meta` block in chat responses. Bump when its shape changes. */
export const CHAT_PROTOCOL_VERSION = "2026-10-09";
export const CHAT_MESSAGE_MAX_CHARS = 2000;
export const CHAT_HISTORY_MAX_MESSAGES = 40;

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(CHAT_MESSAGE_MAX_CHARS * 4),
});

const chatBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(CHAT_HISTORY_MAX_MESSAGES),
});

export type ChatMeta = {
  protocolVersion: string;
  /** Always true: every reply from this endpoint is machine-generated. */
  aiGenerated: true;
  agents: string[];
  tools: string[];
  refusal: { code: RefusalCode } | null;
  /** How many emails, phone numbers, or card numbers were masked before reaching the model. */
  piiRedactions: number;
};

function meta(input: Partial<ChatMeta>): ChatMeta {
  return {
    protocolVersion: CHAT_PROTOCOL_VERSION,
    aiGenerated: true,
    agents: [],
    tools: [],
    refusal: null,
    piiRedactions: 0,
    ...input,
  };
}

export function createAiChatRoutes(
  db: Db,
  limiter: RateLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 }),
): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post("/ai/chat", async (request, reply) => {
      const started = performance.now();
      const orgId = requireOrgId(request);
      const role = accountRole(request);
      const actorId = request.user.sub;
      const { messages } = chatBodySchema.parse(request.body);

      const latest = messages.at(-1)!;
      if (latest.role !== "user") {
        throw new AppError(400, "The last message must be from the user");
      }
      const input = sanitizeUserText(latest.content);
      if (!input) throw new AppError(400, "Invalid request");
      if (input.length > CHAT_MESSAGE_MAX_CHARS) {
        throw new AppError(400, `Messages can be at most ${CHAT_MESSAGE_MAX_CHARS} characters`);
      }

      const audit = { organizationId: orgId, actorId, actorRole: role, input };

      const retryAfter = limiter.hit(`${orgId}:${actorId}`);
      if (retryAfter !== null) {
        await recordAiAuditEvent(db, {
          ...audit,
          outcome: "rate_limited",
          latencyMs: performance.now() - started,
        });
        reply.header("retry-after", String(retryAfter));
        throw new AppError(429, "Too many messages. Please wait a moment and try again.");
      }

      // Policy runs before the model: a refused request never reaches an LLM or a tool.
      // Earlier user turns are checked too, since the client sends the history.
      const refusal =
        checkRequestPolicy(input) ??
        messages
          .filter((message) => message.role === "user")
          .map((message) => checkRequestPolicy(sanitizeUserText(message.content)))
          .find((code) => code !== null) ??
        null;
      if (refusal) {
        await recordAiAuditEvent(db, {
          ...audit,
          outcome: "refused",
          refusalCode: refusal,
          latencyMs: performance.now() - started,
        });
        return {
          reply: REFUSAL_MESSAGES[refusal],
          books: [],
          options: [],
          meta: meta({ refusal: { code: refusal } }),
        };
      }

      if (!isAiConfigured()) {
        throw new AppError(503, "AI search is not configured");
      }

      let piiRedactions = 0;
      const modelMessages = messages.map((message) => {
        const clean = sanitizeUserText(message.content).slice(0, CHAT_MESSAGE_MAX_CHARS);
        if (message.role !== "user") return { role: message.role, content: clean };
        const redacted = redactPii(clean);
        piiRedactions += redacted.redacted;
        return { role: message.role, content: redacted.text };
      });

      const memberId = role === "member" ? actorId : undefined;
      try {
        const result = await generateChatReply({ db, orgId, memberId, messages: modelMessages });
        await recordAiAuditEvent(db, {
          ...audit,
          outcome: "completed",
          agentIds: result.provenance.agents,
          toolIds: result.provenance.tools,
          piiRedactions,
          latencyMs: performance.now() - started,
        });
        const { provenance, ...rest } = result;
        return { ...rest, meta: meta({ ...provenance, piiRedactions }) };
      } catch (error) {
        await recordAiAuditEvent(db, {
          ...audit,
          outcome: "failed",
          piiRedactions,
          latencyMs: performance.now() - started,
        });
        throw error;
      }
    });

    /** Owners review recent AI activity in their library. Digests and counts only — no message text. */
    app.get("/ai/audit-events", { preHandler: app.requireOwner }, async (request) => {
      const orgId = requireOrgId(request);
      const { limit } = z
        .object({ limit: z.coerce.number().int().min(1).max(200).default(50) })
        .parse(request.query);
      return listAiAuditEvents(db, orgId, limit);
    });
  };
}
