import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ChatProvider", () => ({
  useChat: () => ({
    sendMessage: vi.fn(),
    sending: false,
  }),
}));

import { OverviewAskBar } from "./OverviewAskBar";

describe("OverviewAskBar", () => {
  it("renders collapsed pill with placeholder and ask-shell classes", () => {
    const html = renderToStaticMarkup(<OverviewAskBar />);
    expect(html).toContain("ask-shell");
    expect(html).toContain('data-shape="pill"');
    expect(html).toContain("Ask about your work, ideate, or start new chat.");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("ask-bar-grow-in");
  });
});
