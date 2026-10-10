import { describe, expect, it } from "vitest";
import { searchCatalogBooks, type BookSearchHit } from "./search-catalog.js";

const hobbit = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "The Hobbit",
  author: "J. R. R. Tolkien",
  isbn: "9780547928227",
  genre: "Fantasy",
  description: "A hobbit joins dwarves on a quest.",
  publishedYear: 1937,
};

const hobbitHit: BookSearchHit = {
  bookId: hobbit.id,
  title: hobbit.title,
  author: hobbit.author,
  isbn: hobbit.isbn,
  genre: hobbit.genre,
  publishedYear: hobbit.publishedYear,
  text: hobbit.description,
};

const duneHit: BookSearchHit = {
  bookId: "55555555-5555-4555-8555-555555555555",
  title: "Dune",
  author: "Frank Herbert",
  isbn: "9780441172719",
  genre: "Science Fiction",
  text: "Paul Atreides on Arrakis.",
};

describe("searchCatalogBooks", () => {
  it("returns keyword matches when vector search fails", async () => {
    const result = await searchCatalogBooks({
      db: {} as never,
      orgId: "org-1",
      query: "Do we have The Hobbit?",
      vectorSearch: async () => {
        throw new Error('could not access file "vector"');
      },
      keywordSearch: async () => [{ ...hobbitHit, keywordScore: 0.9 }],
    });

    expect(result.relevantContext).toEqual([
      expect.objectContaining({
        bookId: hobbit.id,
        title: "The Hobbit",
        matchType: "title",
      }),
    ]);
  });

  it("fuses vector and keyword hits and prefers the title match", async () => {
    const earthseaId = "22222222-2222-4222-8222-222222222222";
    const result = await searchCatalogBooks({
      db: {} as never,
      orgId: "org-1",
      query: "Do we have The Hobbit?",
      vectorSearch: async () => [
        { ...hobbitHit, vectorScore: 0.72 },
        {
          bookId: earthseaId,
          title: "A Wizard of Earthsea",
          author: "Ursula K. Le Guin",
          genre: "Fantasy",
          vectorScore: 0.5,
        },
      ],
      keywordSearch: async () => [{ ...hobbitHit, keywordScore: 0.8 }],
    });

    expect(result.relevantContext).toEqual([
      expect.objectContaining({
        bookId: hobbit.id,
        matchType: "title",
      }),
    ]);
    expect(result.relevantContext.map((hit) => hit.bookId)).not.toContain(earthseaId);
  });

  it("keeps a high-scoring semantic hit without query-word overlap", async () => {
    const result = await searchCatalogBooks({
      db: {} as never,
      orgId: "org-1",
      query: "science fiction about a desert planet",
      vectorSearch: async () => [{ ...duneHit, vectorScore: 0.82 }],
      keywordSearch: async () => [],
    });

    expect(result.relevantContext).toEqual([
      expect.objectContaining({
        bookId: duneHit.bookId,
        matchType: "semantic",
      }),
    ]);
  });

  it("does not return unrelated books when nothing matches the query", async () => {
    const result = await searchCatalogBooks({
      db: {} as never,
      orgId: "org-1",
      query: "Harry Potter",
      vectorSearch: async () => [hobbitHit],
      keywordSearch: async () => [],
    });

    expect(result.relevantContext).toEqual([]);
  });
});
