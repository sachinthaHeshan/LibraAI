import { apiFetch } from "./api";

export type ChatRole = "user" | "assistant";

export type ChatBook = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string | null;
  description: string | null;
  publishedYear: number | null;
  totalCopies: number;
  availableCopies: number;
};

/** How an assistant reply was produced. Names only; never prompts or tool payloads. */
export type ChatMeta = {
  agents: string[];
  tools: string[];
  /** Policy code when the request was declined before reaching the AI. */
  refusal: string | null;
  /** Emails, phone numbers, or card numbers hidden from the AI in this request. */
  piiRedactions: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  books?: ChatBook[];
  /** Quick replies shown as buttons, e.g. loan durations. */
  options?: string[];
  meta?: ChatMeta;
};

export const PLACEHOLDER_ASSISTANT_REPLY =
  "AI replies aren't connected yet — this is a preview.";

export const WELCOME_COPY = "Hi! What can I help you with today?";

export const CHAT_FOLLOWUP_PLACEHOLDER =
  "Ask about a loan, book, member, or return…";

export const AI_DISCLOSURE =
  "LibraAI is an AI assistant and can make mistakes. Check important details in the catalog, and avoid sharing personal information.";

const AGENT_LABELS: Record<string, string> = {
  searchAgent: "Catalog search",
  recommendationAgent: "Recommendations",
  borrowAgent: "Borrowing",
};

const TOOL_LABELS: Record<string, string> = {
  searchBooks: "searched the catalog",
  getBook: "checked availability",
  getMyMember: "checked your membership",
  offerLoanDurations: "offered loan options",
  borrowBook: "created a loan",
  recommendBooks: "matched your reading profile",
};

const REFUSAL_LABELS: Record<string, string> = {
  destructive_action: "bulk deletion",
  auth_bypass: "permission or instruction changes",
  cross_tenant: "other libraries' data",
  bulk_pii_export: "exporting personal data",
};

/** One-line, human-readable summary of how a reply was produced. */
export function describeChatMeta(meta: ChatMeta): string {
  if (meta.refusal) {
    const topic = REFUSAL_LABELS[meta.refusal] ?? "this request";
    return `Declined by LibraAI's safety policy (${topic}). The AI was not used.`;
  }
  const agents = meta.agents.map((agent) => AGENT_LABELS[agent] ?? agent);
  const tools = meta.tools.map((tool) => TOOL_LABELS[tool] ?? tool);
  if (agents.length === 0 && tools.length === 0) return "AI-generated";
  const via = agents.length > 0 ? ` by ${agents.join(", ")}` : "";
  const steps = tools.length > 0 ? `: ${tools.join(", ")}` : "";
  return `AI-generated${via}${steps}`;
}

export function parseChatMeta(value: unknown): ChatMeta | undefined {
  if (!value || typeof value !== "object") return undefined;
  const meta = value as Record<string, unknown>;
  const names = (list: unknown) =>
    Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
  const refusal = meta.refusal;
  return {
    agents: names(meta.agents),
    tools: names(meta.tools),
    refusal:
      typeof refusal === "string"
        ? refusal
        : refusal && typeof refusal === "object" && typeof (refusal as { code?: unknown }).code === "string"
          ? (refusal as { code: string }).code
          : null,
    piiRedactions:
      typeof meta.piiRedactions === "number" && meta.piiRedactions > 0 ? meta.piiRedactions : 0,
  };
}

export function isSendableContent(content: string): boolean {
  return content.trim().length > 0;
}

export function createChatMessage(
  role: ChatRole,
  content: string,
  now: number = Date.now(),
  books?: ChatBook[],
  options?: string[],
  meta?: ChatMeta,
): ChatMessage {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: now,
    ...(books && books.length > 0 ? { books } : {}),
    ...(options && options.length > 0 ? { options } : {}),
    ...(meta ? { meta } : {}),
  };
}

export function createPlaceholderAssistantMessage(
  now: number = Date.now(),
): ChatMessage {
  return createChatMessage("assistant", PLACEHOLDER_ASSISTANT_REPLY, now);
}

export type ChatApiMessage = {
  role: ChatRole;
  content: string;
};

/**
 * History sent to the API. Declined requests and their refusal replies are left out,
 * so one refused message does not block the rest of the conversation.
 */
export function toChatApiMessages(messages: ChatMessage[]): ChatApiMessage[] {
  return messages
    .filter((message, index) => {
      if (message.meta?.refusal) return false;
      const next = messages[index + 1];
      return !(message.role === "user" && next?.role === "assistant" && next.meta?.refusal);
    })
    .map(({ role, content }) => ({ role, content }));
}

export async function fetchAssistantReply(
  messages: ChatApiMessage[],
  fetchJson: typeof apiFetch = apiFetch,
): Promise<{ reply: string; books: ChatBook[]; options: string[]; meta?: ChatMeta }> {
  const data = await fetchJson<{
    reply: string;
    books?: ChatBook[];
    options?: unknown;
    meta?: unknown;
  }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
  if (!data.reply?.trim()) {
    throw new Error("Empty assistant reply");
  }
  return {
    reply: data.reply,
    books: parseChatBooks(data.books),
    options: parseChatOptions(data.options),
    meta: parseChatMeta(data.meta),
  };
}

export type ChatConversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

export const RECENT_CHATS_PAGE_SIZE = 10;
export const CHAT_STORAGE_KEY = "libra-chat-conversations";

export function conversationTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  return firstUser?.content.trim() || "New chat";
}

export function createConversation(
  messages: ChatMessage[] = [],
  now: number = Date.now(),
): ChatConversation {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: conversationTitle(messages),
    updatedAt: now,
    messages,
  };
}

export function visibleRecentChats<T>(chats: T[], visibleCount: number): T[] {
  return chats.slice(0, visibleCount);
}

export function hasMoreRecentChats(visibleCount: number, total: number): boolean {
  return visibleCount < total;
}

export function nextVisibleChatCount(
  visibleCount: number,
  total: number,
  pageSize: number = RECENT_CHATS_PAGE_SIZE,
): number {
  return Math.min(visibleCount + pageSize, total);
}

export function sortConversationsByRecent(
  conversations: ChatConversation[],
): ChatConversation[] {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function appendMessageToConversation(
  conversations: ChatConversation[],
  conversationId: string,
  message: ChatMessage,
  now: number = Date.now(),
): ChatConversation[] {
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;
    const messages = [...conversation.messages, message];
    return {
      ...conversation,
      messages,
      title: conversationTitle(messages),
      updatedAt: now,
    };
  });
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (elapsed < minute) return "just now";
  if (elapsed < hour) {
    const minutes = Math.floor(elapsed / minute);
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  if (elapsed < day) {
    const hours = Math.floor(elapsed / hour);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (elapsed < week) {
    const days = Math.floor(elapsed / day);
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const weeks = Math.floor(elapsed / week);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function isChatBook(value: unknown): value is ChatBook {
  if (!value || typeof value !== "object") return false;
  const book = value as ChatBook;
  return (
    typeof book.id === "string" &&
    typeof book.title === "string" &&
    typeof book.author === "string" &&
    typeof book.isbn === "string" &&
    typeof book.totalCopies === "number" &&
    typeof book.availableCopies === "number"
  );
}

export function parseChatOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (option): option is string => typeof option === "string" && option.trim().length > 0,
  );
}

export type ChatTurn = {
  id: string;
  messages: ChatMessage[];
};

/** Groups messages into turns: a user question plus the assistant replies that follow it. */
export function groupChatTurns(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    const current = turns.at(-1);
    if (message.role === "user" || !current) {
      turns.push({ id: message.id, messages: [message] });
    } else {
      current.messages.push(message);
    }
  }
  return turns;
}

/** Quick replies belong to the latest assistant message only; older ones are stale. */
export function activeQuickReplies(messages: ChatMessage[]): string[] {
  const last = messages.at(-1);
  return last?.role === "assistant" ? (last.options ?? []) : [];
}

export function parseChatBooks(value: unknown): ChatBook[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isChatBook);
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as ChatMessage;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    typeof message.createdAt === "number" &&
    (message.books === undefined || parseChatBooks(message.books).length === message.books.length) &&
    (message.meta === undefined || parseChatMeta(message.meta) !== undefined)
  );
}

function isChatConversation(value: unknown): value is ChatConversation {
  if (!value || typeof value !== "object") return false;
  const conversation = value as ChatConversation;
  return (
    typeof conversation.id === "string" &&
    typeof conversation.title === "string" &&
    typeof conversation.updatedAt === "number" &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isChatMessage)
  );
}

export function serializeConversations(conversations: ChatConversation[]): string {
  return JSON.stringify(conversations);
}

export function parseConversations(raw: string | null): ChatConversation[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatConversation);
  } catch {
    return [];
  }
}
