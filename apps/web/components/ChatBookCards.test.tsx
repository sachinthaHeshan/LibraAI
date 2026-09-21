import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChatBookCards } from "./ChatBookCards";

const hobbit = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "The Hobbit",
  author: "J. R. R. Tolkien",
  isbn: "9780547928227",
  genre: "Fantasy",
  description: "A hobbit joins dwarves on a quest.",
  publishedYear: 1937,
  totalCopies: 4,
  availableCopies: 2,
};

describe("ChatBookCards", () => {
  it("renders nothing without books", () => {
    expect(renderToStaticMarkup(<ChatBookCards books={[]} />)).toBe("");
  });

  it("renders catalog cards instead of a text list", () => {
    const html = renderToStaticMarkup(<ChatBookCards books={[hobbit]} />);
    expect(html).toContain("The Hobbit");
    expect(html).toContain("J. R. R. Tolkien");
    expect(html).toContain("Fantasy");
    expect(html).toContain("2 / 4");
    expect(html).toContain("In stock");
    expect(html).toContain("chat-book-card");
  });

  it("renders one short full-width card per row", () => {
    const dune = {
      ...hobbit,
      id: "22222222-2222-4222-8222-222222222222",
      title: "Dune",
      author: "Frank Herbert",
    };
    const html = renderToStaticMarkup(<ChatBookCards books={[hobbit, dune]} />);
    expect(html).toContain("grid-cols-1");
    expect(html).not.toContain("sm:grid-cols-2");
    expect(html).not.toContain("A hobbit joins dwarves on a quest.");
  });
});
