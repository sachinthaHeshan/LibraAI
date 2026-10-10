import { describe, expect, it, vi } from "vitest";

import {
  PLACEHOLDER_ASSISTANT_REPLY,
  RECENT_CHATS_PAGE_SIZE,
  activeQuickReplies,
  appendMessageToConversation,
  conversationTitle,
  createChatMessage,
  createConversation,
  createPlaceholderAssistantMessage,
  describeChatMeta,
  fetchAssistantReply,
  formatRelativeTime,
  groupChatTurns,
  hasMoreRecentChats,
  isSendableContent,
  nextVisibleChatCount,
  parseChatMeta,
  parseConversations,
  serializeConversations,
  sortConversationsByRecent,
  toChatApiMessages,
  visibleRecentChats,
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

  it("returns the assistant reply and book cards from the chat API", async () => {
    const books = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "The Hobbit",
        author: "J. R. R. Tolkien",
        isbn: "9780547928227",
        genre: "Fantasy",
        description: "A hobbit joins dwarves on a quest.",
        publishedYear: 1937,
        totalCopies: 4,
        availableCopies: 2,
      },
    ];
    const fetchJson = vi.fn().mockResolvedValue({
      reply: "Here are a few Tolkien titles.",
      books,
    });
    await expect(
      fetchAssistantReply([{ role: "user", content: "Find Tolkien" }], fetchJson),
    ).resolves.toEqual({
      reply: "Here are a few Tolkien titles.",
      books,
      options: [],
    });
    expect(fetchJson).toHaveBeenCalledWith("/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Find Tolkien" }],
      }),
    });
  });

  it("returns quick-reply options from the API", async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      reply: "It's available. How long do you need it?",
      books: [],
      options: ["1 week", "2 weeks", "1 month", 7, ""],
    });
    await expect(
      fetchAssistantReply([{ role: "user", content: "Borrow Dune" }], fetchJson),
    ).resolves.toMatchObject({ options: ["1 week", "2 weeks", "1 month"] });
  });

  it("shows quick replies only for the latest assistant message", () => {
    const offer = createChatMessage("assistant", "How long?", 1, [], ["1 week"]);
    expect(activeQuickReplies([offer])).toEqual(["1 week"]);
    expect(activeQuickReplies([offer, createChatMessage("user", "1 week", 2)])).toEqual([]);
    expect(activeQuickReplies([])).toEqual([]);
  });

  it("groups each question with the replies that follow it", () => {
    const q1 = createChatMessage("user", "Do we have Dune?", 1);
    const a1 = createChatMessage("assistant", "Yes.", 2);
    const q2 = createChatMessage("user", "Borrow it", 3);
    const a2 = createChatMessage("assistant", "How long?", 4);
    const a2b = createChatMessage("assistant", "Error, try again.", 5);
    expect(groupChatTurns([q1, a1, q2, a2, a2b]).map((turn) => turn.messages)).toEqual([
      [q1, a1],
      [q2, a2, a2b],
    ]);
  });

  it("starts a turn for a leading assistant message", () => {
    const hello = createChatMessage("assistant", "Hi!", 1);
    const q = createChatMessage("user", "Hello", 2);
    expect(groupChatTurns([hello, q]).map((turn) => turn.messages)).toEqual([[hello], [q]]);
    expect(groupChatTurns([])).toEqual([]);
  });

  it("rejects empty assistant replies", async () => {
    const fetchJson = vi.fn().mockResolvedValue({ reply: "  " });
    await expect(
      fetchAssistantReply([{ role: "user", content: "Find Tolkien" }], fetchJson),
    ).rejects.toThrow("Empty assistant reply");
  });

  it("creates a conversation titled from the first user message", () => {
    const user = createChatMessage("user", "Find overdue loans", 10);
    const conversation = createConversation([user], 10);
    expect(conversation.id.length).toBeGreaterThan(0);
    expect(conversation.title).toBe("Find overdue loans");
    expect(conversation.updatedAt).toBe(10);
    expect(conversation.messages).toEqual([user]);
  });

  it("falls back to New chat when a conversation has no user message", () => {
    expect(conversationTitle([])).toBe("New chat");
  });

  it("pages recent chats ten at a time", () => {
    const chats = Array.from({ length: 12 }, (_, index) => ({ id: String(index) }));
    expect(RECENT_CHATS_PAGE_SIZE).toBe(10);
    expect(visibleRecentChats(chats, 10)).toHaveLength(10);
    expect(hasMoreRecentChats(10, chats.length)).toBe(true);
    expect(nextVisibleChatCount(10, chats.length)).toBe(12);
    expect(hasMoreRecentChats(12, chats.length)).toBe(false);
  });

  it("sorts conversations newest first", () => {
    const older = createConversation([], 1);
    const newer = createConversation([], 2);
    expect(sortConversationsByRecent([older, newer]).map((chat) => chat.updatedAt)).toEqual([
      2, 1,
    ]);
  });

  it("appends a message and refreshes title plus updatedAt", () => {
    const conversation = createConversation([], 1);
    const user = createChatMessage("user", "List active members", 5);
    const [updated] = appendMessageToConversation([conversation], conversation.id, user, 5);
    expect(updated.messages).toEqual([user]);
    expect(updated.title).toBe("List active members");
    expect(updated.updatedAt).toBe(5);
  });

  it("formats relative timestamps for the recent list", () => {
    const now = 1_700_000_000_000;
    expect(formatRelativeTime(now, now)).toBe("just now");
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(formatRelativeTime(now - 2 * 3_600_000, now)).toBe("2 hours ago");
    expect(formatRelativeTime(now - 7 * 86_400_000, now)).toBe("1 week ago");
  });

  it("round-trips conversations through storage JSON", () => {
    const conversation = createConversation(
      [createChatMessage("user", "Find Tolkien", 1)],
      1,
    );
    expect(parseConversations(serializeConversations([conversation]))).toEqual([
      conversation,
    ]);
    expect(parseConversations("not-json")).toEqual([]);
    expect(parseConversations(null)).toEqual([]);
  });

  it("persists book cards on assistant messages", () => {
    const books = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "The Hobbit",
        author: "J. R. R. Tolkien",
        isbn: "9780547928227",
        genre: "Fantasy",
        description: "A hobbit joins dwarves on a quest.",
        publishedYear: 1937,
        totalCopies: 4,
        availableCopies: 2,
      },
    ];
    const conversation = createConversation(
      [createChatMessage("assistant", "Here you go.", 1, books)],
      1,
    );
    expect(parseConversations(serializeConversations([conversation]))[0]?.messages[0]?.books).toEqual(
      books,
    );
  });
});

describe("chat metadata", () => {
  it("parses API metadata and tolerates junk", () => {
    expect(
      parseChatMeta({
        aiGenerated: true,
        agents: ["borrowAgent", 3],
        tools: ["borrowBook"],
        refusal: { code: "auth_bypass" },
        piiRedactions: 2,
      }),
    ).toEqual({ agents: ["borrowAgent"], tools: ["borrowBook"], refusal: "auth_bypass", piiRedactions: 2 });
    expect(parseChatMeta(null)).toBeUndefined();
    expect(parseChatMeta({})).toEqual({ agents: [], tools: [], refusal: null, piiRedactions: 0 });
  });

  it("returns metadata from the chat API", async () => {
    const fetchJson = vi.fn(async () => ({
      reply: "Found it.",
      meta: { agents: ["searchAgent"], tools: [], refusal: null, piiRedactions: 0 },
    })) as never;
    const result = await fetchAssistantReply([{ role: "user", content: "Dune?" }], fetchJson);
    expect(result.meta).toEqual({ agents: ["searchAgent"], tools: [], refusal: null, piiRedactions: 0 });
  });

  it("keeps metadata through local storage", () => {
    const meta = { agents: ["searchAgent"], tools: ["searchBooks"], refusal: null, piiRedactions: 0 };
    const conversation = createConversation(
      [createChatMessage("assistant", "Yes.", 1, undefined, undefined, meta)],
      1,
    );
    const [restored] = parseConversations(serializeConversations([conversation]));
    expect(restored?.messages[0]?.meta).toEqual(meta);
  });

  it("leaves refused turns out of the history sent to the API", () => {
    const refusal = { agents: [], tools: [], refusal: "destructive_action", piiRedactions: 0 };
    const messages = [
      createChatMessage("user", "Delete all members", 1),
      createChatMessage("assistant", "I can't do that.", 2, undefined, undefined, refusal),
      createChatMessage("user", "Do you have Dune?", 3),
    ];
    expect(toChatApiMessages(messages)).toEqual([{ role: "user", content: "Do you have Dune?" }]);
  });

  it("describes how a reply was produced", () => {
    expect(describeChatMeta({ agents: [], tools: [], refusal: null, piiRedactions: 0 })).toBe("AI-generated");
    expect(
      describeChatMeta({ agents: ["recommendationAgent"], tools: ["recommendBooks"], refusal: null, piiRedactions: 0 }),
    ).toBe("AI-generated by Recommendations: matched your reading profile");
  });
});
