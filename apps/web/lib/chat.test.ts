import { describe, expect, it } from "vitest";

import {
  PLACEHOLDER_ASSISTANT_REPLY,
  createChatMessage,
  createPlaceholderAssistantMessage,
  isSendableContent,
} from "./chat";

describe("chat helpers", () => {
  it("trims and rejects empty content", () => {
    expect(isSendableContent("")).toBe(false);
    expect(isSendableContent("   ")).toBe(false);
    expect(isSendableContent("hello")).toBe(true);
  });

  it("creates a message with role, content, id, and createdAt", () => {
    const msg = createChatMessage("user", "  hi  ", 1_700_000_000_000);
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("  hi  ");
    expect(msg.createdAt).toBe(1_700_000_000_000);
    expect(typeof msg.id).toBe("string");
    expect(msg.id.length).toBeGreaterThan(0);
  });

  it("builds the canned assistant reply", () => {
    const msg = createPlaceholderAssistantMessage(1_700_000_000_001);
    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe(PLACEHOLDER_ASSISTANT_REPLY);
    expect(msg.createdAt).toBe(1_700_000_000_001);
  });
});
