import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ChatProvider", () => ({
  useChat: () => ({
    open: true,
    messages: [],
    sending: false,
    toggle: vi.fn(),
    close: vi.fn(),
    sendMessage: vi.fn(),
  }),
}));

import { ChatWidget } from "./ChatWidget";

describe("ChatWidget", () => {
  it("uses ask-shell composer with circular send when open", () => {
    const html = renderToStaticMarkup(<ChatWidget />);
    expect(html).toContain("ask-shell");
    expect(html).toContain("ask-shell-composer");
    expect(html).toContain("Ask about loans, books, or members…");
    expect(html).toContain('aria-label="Send message"');
    expect(html).not.toContain(">Send</button>");
  });
});
