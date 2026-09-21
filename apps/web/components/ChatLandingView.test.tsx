import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createChatMessage, createConversation } from "@/lib/chat";

import { ChatLandingView } from "./ChatLandingView";

describe("ChatLandingView", () => {
  it("shows the hero composer without recent chats when history is empty", () => {
    const html = renderToStaticMarkup(
      <ChatLandingView conversations={[]} sending={false} onSend={vi.fn()} />,
    );

    expect(html).toContain("How can I help today?");
    expect(html).toContain("Ask about a loan, book, member, or return…");
    expect(html).toContain("ask-shell-composer");
    expect(html).not.toContain("Recent chats");
  });

  it("shows recent chats under the composer", () => {
    const conversation = createConversation(
      [createChatMessage("user", "Find overdue loans", 1)],
      1,
    );
    const html = renderToStaticMarkup(
      <ChatLandingView
        conversations={[conversation]}
        sending={false}
        onSend={vi.fn()}
      />,
    );

    expect(html).toContain("Recent chats");
    expect(html).toContain("Find overdue loans");
  });
});
