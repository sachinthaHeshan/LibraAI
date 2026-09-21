import { describe, expect, it, vi } from "vitest";
import { catalogSearchTerms, searchCatalogBooks } from "./search-catalog.js";

const hobbit = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "The Hobbit",
  author: "J. R. R. Tolkien",
  isbn: "9780547928227",
  genre: "Fantasy",
  description: "A hobbit joins dwarves on a quest.",
  publishedYear: 1937,
};

function dbWithBooks(rows: unknown[]) {
  return {
    query: {
      books: {
        findMany: vi.fn().mockResolvedValue(rows),
      },
    },
  };
}

describe("catalogSearchTerms", () => {
  it("keeps distinctive words from a natural-language question", () => {
    expect(catalogSearchTerms("Do we have The Hobbit?")).toEqual(
      expect.arrayContaining(["Hobbit"]),
    );
    expect(catalogSearchTerms("Do we have The Hobbit?")).not.toEqual(
      expect.arrayContaining(["The", "have"]),
    );
  });
});

describe("searchCatalogBooks", () => {
  it("returns keyword matches when vector search fails", async () => {
    const db = dbWithBooks([hobbit]);

    const result = await searchCatalogBooks({
      db: db as never,
      orgId: "org-1",
      query: "Hobbit",
      vectorSearch: async () => {
        throw new Error('could not access file "vector"');
      },
    });

    expect(result.relevantContext).toEqual([
      expect.objectContaining({
        bookId: hobbit.id,
        title: "The Hobbit",
        author: "J. R. R. Tolkien",
      }),
    ]);
  });

  it("keeps related vector hits and appends unique keyword hits", async () => {
    const db = dbWithBooks([hobbit]);

    const result = await searchCatalogBooks({
      db: db as never,
      orgId: "org-1",
      query: "fantasy",
      vectorSearch: async () => [
        {
          bookId: "22222222-2222-4222-8222-222222222222",
          title: "A Wizard of Earthsea",
          author: "Ursula K. Le Guin",
          genre: "Fantasy",
        },
      ],
    });

    expect(result.relevantContext.map((hit) => hit.bookId)).toEqual([
      "22222222-2222-4222-8222-222222222222",
      hobbit.id,
    ]);
  });

  it("does not return unrelated books when nothing matches the query", async () => {
    const db = dbWithBooks([]);

    const result = await searchCatalogBooks({
      db: db as never,
      orgId: "org-1",
      query: "Harry Potter",
      vectorSearch: async () => [
        {
          bookId: hobbit.id,
          title: hobbit.title,
          author: hobbit.author,
          genre: hobbit.genre,
          text: hobbit.description,
        },
      ],
    });

    expect(result.relevantContext).toEqual([]);
  });
});
