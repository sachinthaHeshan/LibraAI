import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createChatMessage, createConversation } from "@/lib/chat";

import { RecentChats } from "./RecentChats";

describe("RecentChats", () => {
  it("renders nothing when there are no conversations", () => {
    const html = renderToStaticMarkup(<RecentChats conversations={[]} />);
    expect(html).toBe("");
  });

  it("lists titles, times, and load more after ten chats", () => {
    const now = 1_700_000_000_000;
    const conversations = Array.from({ length: 12 }, (_, index) =>
      createConversation(
        [createChatMessage("user", `Find book ${index + 1}`, now - index)],
        now - index,
      ),
    );

    const html = renderToStaticMarkup(
      <RecentChats conversations={conversations} now={now} />,
    );

    expect(html).toContain("Recent chats");
    expect(html).toContain("Find book 1");
    expect(html).toContain("Find book 10");
    expect(html).not.toContain("Find book 11");
    expect(html).toContain("just now");
    expect(html).toContain("Load more");
    expect(html).toContain(`/chat/${conversations[0]!.id}`);
  });
});
