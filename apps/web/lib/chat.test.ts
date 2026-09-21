import { describe, expect, it, vi } from "vitest";

import {
  PLACEHOLDER_ASSISTANT_REPLY,
  RECENT_CHATS_PAGE_SIZE,
  appendMessageToConversation,
  conversationTitle,
  createChatMessage,
  createConversation,
  createPlaceholderAssistantMessage,
  fetchAssistantReply,
  formatRelativeTime,
  hasMoreRecentChats,
  isSendableContent,
  nextVisibleChatCount,
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
    });
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
