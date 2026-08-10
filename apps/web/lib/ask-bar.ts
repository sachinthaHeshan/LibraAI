import { isSendableContent } from "./chat";

export const ASK_PLACEHOLDER =
  "Ask about loans, books, members, or catalogue tasks.";

export function submitAskDraft(
  draft: string,
  actions: {
    sendMessage: (content: string) => void;
    navigate: (href: string) => void;
  },
): boolean {
  if (!isSendableContent(draft)) return false;
  actions.sendMessage(draft);
  actions.navigate("/chat");
  return true;
}
