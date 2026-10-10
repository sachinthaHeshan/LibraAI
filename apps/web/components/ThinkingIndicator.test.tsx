import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThinkingIndicator, formatThinkingElapsed } from "./ThinkingIndicator";

describe("formatThinkingElapsed", () => {
  it("formats seconds and minutes for the thinking timer", () => {
    expect(formatThinkingElapsed(0)).toBe("0s");
    expect(formatThinkingElapsed(1_400)).toBe("1s");
    expect(formatThinkingElapsed(61_000)).toBe("1m 1s");
  });
});

describe("ThinkingIndicator", () => {
  it("renders the magical thinking status", () => {
    const html = renderToStaticMarkup(<ThinkingIndicator />);
    expect(html).toContain("Thinking");
    expect(html).toContain("thinking-indicator");
    expect(html).toContain('role="status"');
  });
});
