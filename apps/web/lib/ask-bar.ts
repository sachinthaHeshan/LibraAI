import { isSendableContent } from "./chat";

export const ASK_PLACEHOLDER =
  "Ask about loans, books, members, or catalogue tasks.";

export function submitAskDraft(
  draft: string,
  actions: {
    startConversation: (content: string) => string;
    navigate: (href: string) => void;
  },
): boolean {
  if (!isSendableContent(draft)) return false;
  const chatId = actions.startConversation(draft);
  if (!chatId) return false;
  actions.navigate(`/chat/${chatId}`);
  return true;
}
