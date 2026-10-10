import { createHash } from "node:crypto";
import { aiAuditEvents, type Db } from "@libra/db";
import { desc, eq } from "drizzle-orm";
import type { RefusalCode } from "./policy.js";

export type AiAuditEvent = {
  organizationId: string;
  actorId: string;
  actorRole: string;
  outcome: "completed" | "refused" | "rate_limited" | "failed";
  refusalCode?: RefusalCode | null;
  agentIds?: string[];
  toolIds?: string[];
  /** The user's message. Only its digest and length are stored. */
  input: string;
  piiRedactions?: number;
  latencyMs: number;
};

export function digestInput(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** The row written for an event: identifiers and counts, no message content. */
export function toAuditRow(event: AiAuditEvent): typeof aiAuditEvents.$inferInsert {
  return {
    organizationId: event.organizationId,
    actorId: event.actorId,
    actorRole: event.actorRole,
    outcome: event.outcome,
    refusalCode: event.refusalCode ?? null,
    agentIds: event.agentIds ?? [],
    toolIds: event.toolIds ?? [],
    inputDigest: digestInput(event.input),
    inputChars: event.input.length,
    piiRedactions: event.piiRedactions ?? 0,
    latencyMs: Math.round(event.latencyMs),
  };
}

/** Appends an audit event. A failed write is logged but never blocks the chat reply. */
export async function recordAiAuditEvent(db: Db, event: AiAuditEvent): Promise<void> {
  try {
    await db.insert(aiAuditEvents).values(toAuditRow(event));
  } catch (error) {
    console.error("Failed to record AI audit event", error);
  }
}

/** Most recent events for one organization, newest first. */
export async function listAiAuditEvents(db: Db, organizationId: string, limit: number) {
  return db
    .select({
      id: aiAuditEvents.id,
      actorId: aiAuditEvents.actorId,
      actorRole: aiAuditEvents.actorRole,
      outcome: aiAuditEvents.outcome,
      refusalCode: aiAuditEvents.refusalCode,
      agentIds: aiAuditEvents.agentIds,
      toolIds: aiAuditEvents.toolIds,
      inputDigest: aiAuditEvents.inputDigest,
      inputChars: aiAuditEvents.inputChars,
      piiRedactions: aiAuditEvents.piiRedactions,
      latencyMs: aiAuditEvents.latencyMs,
      createdAt: aiAuditEvents.createdAt,
    })
    .from(aiAuditEvents)
    .where(eq(aiAuditEvents.organizationId, organizationId))
    .orderBy(desc(aiAuditEvents.createdAt))
    .limit(limit);
}
