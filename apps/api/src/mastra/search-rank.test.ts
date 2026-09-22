import { describe, expect, it } from "vitest";
import { VECTOR_MIN_SCORE } from "./constants.js";
import { exactMatchBoost, fuseSearchHits, rrfScore } from "./search-rank.js";

const hobbit = {
  bookId: "11111111-1111-4111-8111-111111111111",
  title: "The Hobbit",
  author: "J. R. R. Tolkien",
  isbn: "9780547928227",
  genre: "Fantasy",
  text: "A hobbit joins dwarves on a quest.",
};

const atomicHabits = {
  bookId: "33333333-3333-4333-8333-333333333333",
  title: "Atomic Habits",
  author: "James Clear",
  isbn: "9780735211292",
  genre: "Self-help",
  text: "A practical system for building good habits.",
};

const habitsGuide = {
  bookId: "44444444-4444-4444-8444-444444444444",
  title: "Sleep Better",
  author: "Jane Doe",
  isbn: "9780000000001",
  genre: "Self-help",
  text: "How daily habits affect rest.",
};

const dune = {
  bookId: "55555555-5555-4555-8555-555555555555",
  title: "Dune",
  author: "Frank Herbert",
  isbn: "9780441172719",
  genre: "Science Fiction",
  text: "Paul Atreides on Arrakis.",
};

describe("rrfScore", () => {
  it("adds 1/(k+rank) across lists", () => {
    expect(rrfScore([1, 1])).toBeCloseTo(2 / 61, 8);
    expect(rrfScore([1])).toBeCloseTo(1 / 61, 8);
  });
});

describe("exactMatchBoost", () => {
  it("boosts exact titles over description-only overlap", () => {
    expect(exactMatchBoost("Atomic Habits", atomicHabits)).toBe(2);
    expect(exactMatchBoost("Atomic Habits", habitsGuide)).toBe(0);
  });

  it("boosts ISBN equality", () => {
    expect(exactMatchBoost("978-054-7928227", hobbit)).toBe(2);
  });
});

describe("fuseSearchHits", () => {
  it("ranks a book in both lists above a book in one list", () => {
    const fused = fuseSearchHits({
      query: "fantasy quest",
      keywordHits: [
        { ...hobbit, keywordScore: 0.4 },
        { ...dune, keywordScore: 0.2 },
      ],
      vectorHits: [{ ...hobbit, vectorScore: 0.8 }],
    });

    expect(fused[0]?.bookId).toBe(hobbit.bookId);
    expect(fused[0]?.score ?? 0).toBeGreaterThan(fused[1]?.score ?? 0);
  });

  it("puts an exact title match first", () => {
    const fused = fuseSearchHits({
      query: "Do we have The Hobbit?",
      keywordHits: [
        { ...habitsGuide, keywordScore: 0.1 },
        { ...hobbit, keywordScore: 0.9 },
      ],
      vectorHits: [],
    });

    expect(fused[0]).toEqual(
      expect.objectContaining({
        bookId: hobbit.bookId,
        matchType: "title",
      }),
    );
  });

  it("ranks Atomic Habits above a book that only mentions habits", () => {
    const fused = fuseSearchHits({
      query: "Atomic Habits",
      keywordHits: [
        { ...habitsGuide, keywordScore: 0.2 },
        { ...atomicHabits, keywordScore: 0.5 },
      ],
      vectorHits: [],
    });

    expect(fused.map((hit) => hit.bookId)).toEqual([
      atomicHabits.bookId,
      habitsGuide.bookId,
    ]);
    expect(fused[0]?.matchType).toBe("title");
  });

  it("keeps a high-scoring semantic hit whose title has no query words", () => {
    const fused = fuseSearchHits({
      query: "science fiction about a desert planet",
      keywordHits: [],
      vectorHits: [{ ...dune, vectorScore: 0.82 }],
    });

    expect(fused).toEqual([
      expect.objectContaining({
        bookId: dune.bookId,
        matchType: "semantic",
      }),
    ]);
  });

  it("drops unscored vector hits below the min score", () => {
    const fused = fuseSearchHits({
      query: "Harry Potter",
      keywordHits: [],
      vectorHits: [hobbit],
    });

    expect(fused).toEqual([]);
    expect(VECTOR_MIN_SCORE).toBeGreaterThan(0.25);
  });
});
