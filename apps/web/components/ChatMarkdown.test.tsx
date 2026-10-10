import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatMarkdown, parseBlocks } from "./ChatMarkdown";

const render = (content: string) => renderToStaticMarkup(<ChatMarkdown content={content} />);

describe("parseBlocks", () => {
  it("groups paragraphs, headings, and bulleted and numbered lists", () => {
    expect(
      parseBlocks("Here are picks:\n\n- **Dune** — sci-fi\n* Emma\n\n1. First\n2. Second\n## Note\nBye"),
    ).toEqual([
      { type: "paragraph", lines: ["Here are picks:"] },
      { type: "list", ordered: false, items: ["**Dune** — sci-fi", "Emma"] },
      { type: "list", ordered: true, items: ["First", "Second"] },
      { type: "heading", text: "Note" },
      { type: "paragraph", lines: ["Bye"] },
    ]);
  });
});

describe("ChatMarkdown", () => {
  it("renders bold list items instead of raw markdown", () => {
    const html = render("- **The Alchemist** by Paulo Coelho");
    expect(html).toContain("<ul");
    expect(html).toContain('<strong class="font-semibold text-ink">The Alchemist</strong> by Paulo Coelho');
    expect(html).not.toContain("**");
    expect(html).not.toContain("- ");
  });

  it("renders italics, code, numbered lists, and line breaks", () => {
    const html = render("Due *21 Oct* — id `abc`\nSecond line\n\n1. One");
    expect(html).toContain("<em>21 Oct</em>");
    expect(html).toContain(">abc</code>");
    expect(html).toContain("<br/>Second line");
    expect(html).toContain("<ol");
  });

  it("escapes HTML in model output", () => {
    const html = render("<img src=x onerror=alert(1)> **hi**");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("leaves lone asterisks and snake_case words alone", () => {
    const html = render("5 * 3 and file_name_here");
    expect(html).toContain("5 * 3 and file_name_here");
  });
});
