import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageBreadcrumb } from "./PageBreadcrumb";

describe("PageBreadcrumb", () => {
  it("renders a chat trail with the current conversation title", () => {
    const html = renderToStaticMarkup(
      <PageBreadcrumb
        current="Find overdue loans"
        parentHref="/chat"
        parentLabel="Chat"
      />,
    );

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/chat"');
    expect(html).toContain("Chat");
    expect(html).toContain("Find overdue loans");
    expect(html).toContain('aria-current="page"');
  });
});
