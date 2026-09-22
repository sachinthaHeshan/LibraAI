import { describe, expect, it } from "vitest";
import {
  catalogSearchTerms,
  isbnDigits,
  normalizeRetrievalQuery,
  retrievalQueryForFts,
} from "./search-query.js";

describe("normalizeRetrievalQuery", () => {
  it("strips conversational filler from a catalog question", () => {
    expect(normalizeRetrievalQuery("Do we have Atomic Habits?")).toBe(
      "Atomic Habits",
    );
    expect(normalizeRetrievalQuery("Do we have The Hobbit?")).toBe("Hobbit");
  });

  it("drops stopwords from topical questions", () => {
    expect(normalizeRetrievalQuery("science fiction about a desert planet")).toBe(
      "science fiction desert planet",
    );
  });

  it("returns empty for stopword-only queries", () => {
    expect(normalizeRetrievalQuery("do we have any books?")).toBe("");
    expect(normalizeRetrievalQuery("   ")).toBe("");
  });
});

describe("catalogSearchTerms", () => {
  it("keeps distinctive words from a natural-language question", () => {
    expect(catalogSearchTerms("Do we have The Hobbit?")).toEqual(["Hobbit"]);
    expect(catalogSearchTerms("Do we have The Hobbit?")).not.toEqual(
      expect.arrayContaining(["The", "have"]),
    );
  });

  it("does not include the full sentence as a term", () => {
    expect(catalogSearchTerms("Do we have The Hobbit?")).not.toContain(
      "Do we have The Hobbit?",
    );
  });
});

describe("isbnDigits", () => {
  it("recognizes hyphenated ISBNs", () => {
    expect(isbnDigits("978-0-441-17271-9")).toBe("9780441172719");
  });

  it("returns null for titles", () => {
    expect(isbnDigits("The Hobbit")).toBeNull();
  });
});

describe("retrievalQueryForFts", () => {
  it("returns the normalized query for FTS", () => {
    expect(retrievalQueryForFts("Recommend something like Tolkien")).toBe(
      "Tolkien",
    );
  });

  it("returns null when nothing distinctive remains", () => {
    expect(retrievalQueryForFts("please find a book")).toBeNull();
  });
});
