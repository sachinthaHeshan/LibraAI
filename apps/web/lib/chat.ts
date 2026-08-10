export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export const PLACEHOLDER_ASSISTANT_REPLY =
  "AI replies aren't connected yet — this is a preview.";

export const WELCOME_COPY =
  "Hi — I'm the LibraAI assistant preview. Ask anything; replies are placeholders for now.";

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
