import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BorrowBookForm } from "./BorrowBookForm";

describe("BorrowBookForm", () => {
  it("lists only available books and the three loan periods", () => {
    const html = renderToStaticMarkup(
      <BorrowBookForm
        books={[
          { id: "a", title: "Dune", availableCopies: 2 },
          { id: "b", title: "Gone Book", availableCopies: 0 },
        ]}
        onSubmit={vi.fn()}
      />,
    );

    expect(html).toContain("Dune (2 available)");
    expect(html).not.toContain("Gone Book");
    for (const period of ["1 week", "2 weeks", "1 month"]) {
      expect(html).toContain(`>${period}</button>`);
    }
    expect(html).toMatch(/aria-pressed="true"[^>]*>2 weeks</);
  });

  it("disables borrowing when no books are available", () => {
    const html = renderToStaticMarkup(
      <BorrowBookForm books={[{ id: "b", title: "Gone", availableCopies: 0 }]} onSubmit={vi.fn()} />,
    );
    expect(html).toContain("No books available");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="submit"/);
  });
});
