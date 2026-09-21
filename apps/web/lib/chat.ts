import { apiFetch } from "./api";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export const PLACEHOLDER_ASSISTANT_REPLY =
  "AI replies aren't connected yet — this is a preview.";

export const WELCOME_COPY = "Hi! What can I help you with today?";

export const CHAT_FOLLOWUP_PLACEHOLDER =
  "Ask about a loan, book, member, or return…";

export function isSendableContent(content: string): boolean {
  return content.trim().length > 0;
}

export function createChatMessage(
  role: ChatRole,
  content: string,
  now: number = Date.now(),
): ChatMessage {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: now,
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

export function toChatApiMessages(messages: ChatMessage[]): ChatApiMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

export async function fetchAssistantReply(
  messages: ChatApiMessage[],
  fetchJson: typeof apiFetch = apiFetch,
): Promise<string> {
  const data = await fetchJson<{ reply: string }>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
  if (!data.reply?.trim()) {
    throw new Error("Empty assistant reply");
  }
  return data.reply;
}
