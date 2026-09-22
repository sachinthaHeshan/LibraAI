import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat/abc",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ChatProvider", () => ({
  useChat: () => ({ reset: vi.fn() }),
}));

vi.mock("@/components/ChatWidget", () => ({
  ChatWidget: () => null,
}));

vi.mock("@/lib/current-user", () => ({
  getCurrentUser: () => Promise.resolve(null),
  userInitials: () => "A",
}));

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("shows a sticky header breadcrumb when provided", () => {
    const html = renderToStaticMarkup(
      <AppShell
        breadcrumb={{
          current: "Find overdue loans",
          parentHref: "/chat",
          parentLabel: "Chat",
        }}
      >
        <p>thread</p>
      </AppShell>,
    );

    expect(html).toContain("sticky top-0");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/chat"');
    expect(html).toContain("Find overdue loans");
  });
});
