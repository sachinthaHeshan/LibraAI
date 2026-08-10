import { describe, expect, it, vi } from "vitest";

import { ASK_PLACEHOLDER, submitAskDraft } from "./ask-bar";

describe("ask-bar helpers", () => {
  it("exposes the overview ask placeholder copy", () => {
    expect(ASK_PLACEHOLDER).toBe(
      "Ask about your work, ideate, or start new chat.",
    );
  });

  it("rejects empty drafts without sending or navigating", () => {
    const sendMessage = vi.fn();
    const navigate = vi.fn();
    expect(submitAskDraft("   ", { sendMessage, navigate })).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends then navigates to /chat for a non-empty draft", () => {
    const sendMessage = vi.fn();
    const navigate = vi.fn();
    expect(submitAskDraft("Find overdue loans", { sendMessage, navigate })).toBe(
      true,
    );
    expect(sendMessage).toHaveBeenCalledWith("Find overdue loans");
    expect(navigate).toHaveBeenCalledWith("/chat");
    expect(sendMessage.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0]!,
    );
  });
});
