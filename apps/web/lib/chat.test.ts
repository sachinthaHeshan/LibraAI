import { describe, expect, it, vi } from "vitest";

import {
  PLACEHOLDER_ASSISTANT_REPLY,
  createChatMessage,
  createPlaceholderAssistantMessage,
  fetchAssistantReply,
  isSendableContent,
  toChatApiMessages,
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

  it("maps messages to chat API payloads", () => {
    const user = createChatMessage("user", "Find Tolkien", 1);
    const assistant = createChatMessage("assistant", "The Hobbit", 2);
    expect(toChatApiMessages([user, assistant])).toEqual([
      { role: "user", content: "Find Tolkien" },
      { role: "assistant", content: "The Hobbit" },
    ]);
  });

  it("returns the assistant reply from the chat API", async () => {
    const fetchJson = vi.fn().mockResolvedValue({ reply: "The Hobbit is in stock." });
    await expect(
      fetchAssistantReply([{ role: "user", content: "Find Tolkien" }], fetchJson),
    ).resolves.toBe("The Hobbit is in stock.");
    expect(fetchJson).toHaveBeenCalledWith("/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Find Tolkien" }],
      }),
    });
  });

  it("rejects empty assistant replies", async () => {
    const fetchJson = vi.fn().mockResolvedValue({ reply: "  " });
    await expect(
      fetchAssistantReply([{ role: "user", content: "Find Tolkien" }], fetchJson),
    ).rejects.toThrow("Empty assistant reply");
  });
});
