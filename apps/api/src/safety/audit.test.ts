import { describe, expect, it } from "vitest";
import { digestInput, toAuditRow } from "./audit.js";

describe("toAuditRow", () => {
  it("stores a digest and length instead of the message", () => {
    const input = "I'm jane@example.com, phone 0771234567 — do you have Dune?";
    const row = toAuditRow({
      organizationId: "org",
      actorId: "user",
      actorRole: "member",
      outcome: "completed",
      agentIds: ["searchAgent"],
      toolIds: ["searchBooks"],
      input,
      latencyMs: 12.6,
    });

    expect(row.inputDigest).toBe(digestInput(input));
    expect(row.inputDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(row.inputChars).toBe(input.length);
    expect(row.latencyMs).toBe(13);
    expect(JSON.stringify(row)).not.toMatch(/jane|example\.com|0771234567|Dune/);
  });
});
