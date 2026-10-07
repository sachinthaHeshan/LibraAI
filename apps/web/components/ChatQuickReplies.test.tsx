import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ChatQuickReplies } from "./ChatQuickReplies";

describe("ChatQuickReplies", () => {
  it("renders a button per option", () => {
    const html = renderToStaticMarkup(
      <ChatQuickReplies onSelect={vi.fn()} options={["1 week", "2 weeks", "1 month"]} />,
    );
    expect(html).toContain('aria-label="Suggested replies"');
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toContain("1 month");
  });

  it("renders nothing without options", () => {
    expect(renderToStaticMarkup(<ChatQuickReplies onSelect={vi.fn()} options={[]} />)).toBe("");
  });
});
