import { describe, expect, it, vi } from "vitest";

import { ASK_PLACEHOLDER, submitAskDraft } from "./ask-bar";

describe("ask-bar helpers", () => {
  it("exposes the overview ask placeholder copy", () => {
    expect(ASK_PLACEHOLDER).toBe(
      "Ask about loans, books, members, or catalogue tasks.",
    );
  });

  it("rejects empty drafts without sending or navigating", () => {
    const startConversation = vi.fn();
    const navigate = vi.fn();
    expect(submitAskDraft("   ", { startConversation, navigate })).toBe(false);
    expect(startConversation).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("starts a conversation then navigates to /chat/:id", () => {
    const startConversation = vi.fn().mockReturnValue("chat-42");
    const navigate = vi.fn();
    expect(submitAskDraft("Find overdue loans", { startConversation, navigate })).toBe(
      true,
    );
    expect(startConversation).toHaveBeenCalledWith("Find overdue loans");
    expect(navigate).toHaveBeenCalledWith("/chat/chat-42");
    expect(startConversation.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0]!,
    );
  });

  it("does not navigate when starting a conversation returns no id", () => {
    const startConversation = vi.fn().mockReturnValue("");
    const navigate = vi.fn();
    expect(submitAskDraft("Find overdue loans", { startConversation, navigate })).toBe(
      false,
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
