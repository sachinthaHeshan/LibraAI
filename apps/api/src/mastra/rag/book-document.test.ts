import { describe, expect, it } from "vitest";
import {
  buildBookDocumentText,
  buildBookEmbeddingMetadata,
} from "./book-document.js";

describe("buildBookDocumentText", () => {
  it("includes title, author, isbn, year, genre, and description", () => {
    const text = buildBookDocumentText({
      title: "The Hobbit",
      author: "J. R. R. Tolkien",
      isbn: "9780547928227",
      publishedYear: 1937,
      genre: "Fantasy",
      description: "A hobbit joins dwarves on a quest.",
    });

    expect(text).toBe(
      [
        "Title: The Hobbit",
        "Author: J. R. R. Tolkien",
        "ISBN: 9780547928227",
        "Year: 1937",
        "Genre: Fantasy",
        "Description: A hobbit joins dwarves on a quest.",
      ].join("\n"),
    );
  });

  it("omits empty optional fields", () => {
    const text = buildBookDocumentText({
      title: "Dune",
      author: "Frank Herbert",
      isbn: "9780441172719",
    });

    expect(text).toBe(
      ["Title: Dune", "Author: Frank Herbert", "ISBN: 9780441172719"].join("\n"),
    );
    expect(text).not.toContain("Year:");
    expect(text).not.toContain("Genre:");
    expect(text).not.toContain("Description:");
  });
});

describe("buildBookEmbeddingMetadata", () => {
  it("stores org-scoped retrieval fields plus chunk text", () => {
    expect(
      buildBookEmbeddingMetadata({
        id: "11111111-1111-4111-8111-111111111111",
        organizationId: "22222222-2222-4222-8222-222222222222",
        title: "Dune",
        author: "Frank Herbert",
        isbn: "9780441172719",
        publishedYear: 1965,
        genre: "Science Fiction",
        description: "A desert planet and a messianic prophecy.",
      }),
    ).toEqual({
      text: [
        "Title: Dune",
        "Author: Frank Herbert",
        "ISBN: 9780441172719",
        "Year: 1965",
        "Genre: Science Fiction",
        "Description: A desert planet and a messianic prophecy.",
      ].join("\n"),
      bookId: "11111111-1111-4111-8111-111111111111",
      organizationId: "22222222-2222-4222-8222-222222222222",
      title: "Dune",
      author: "Frank Herbert",
      isbn: "9780441172719",
      genre: "Science Fiction",
      publishedYear: 1965,
    });
  });
});
