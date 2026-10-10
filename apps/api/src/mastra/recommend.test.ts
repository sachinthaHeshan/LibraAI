import { books, createDb, loans, memberPreferences, members, organizations } from "@libra/db";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "../env.js";
import { findRecommendations, recommendationBasis, recommendationQueries } from "./recommend.js";
import type { SearchCatalogResult } from "./search-catalog.js";

describe("recommendationQueries", () => {
  const profile = {
    preferences: ["Fantasy", "History"],
    history: [
      { bookId: "b1", title: "Dune", author: "Frank Herbert", genre: "Science fiction" },
      { bookId: "b2", title: "Dune Messiah", author: "Frank Herbert", genre: "Science fiction" },
    ],
  };

  it("uses preferences, borrowed genres, and borrowed authors when there is no request", () => {
    expect(recommendationQueries(profile)).toEqual([
      { query: "Fantasy", reason: "Matches your interest in Fantasy", weight: 1 },
      { query: "History", reason: "Matches your interest in History", weight: 1 },
      { query: "Science fiction", reason: "Similar to Dune, which you borrowed", weight: 0.8 },
      {
        query: "Frank Herbert",
        reason: "By Frank Herbert, whose books you've borrowed",
        weight: 0.6,
      },
    ]);
  });

  it("puts the user's request first and weights it above the profile", () => {
    const [first, second] = recommendationQueries(profile, " cozy mystery ");
    expect(first).toEqual({ query: "cozy mystery", reason: 'Matches "cozy mystery"', weight: 3 });
    expect(second!.weight).toBe(0.5);
  });

  it("returns no queries without a request or profile", () => {
    expect(recommendationQueries({ preferences: [], history: [] })).toEqual([]);
  });
});

describe("recommendationBasis", () => {
  const profile = { preferences: ["Fantasy", "History"], history: [] };
  const book = (reasons: string[]) => ({
    bookId: "x",
    title: "x",
    author: "x",
    genre: null,
    availableCopies: 1,
    reasons,
  });

  it("describes popular fallback picks", () => {
    expect(recommendationBasis(profile, [book(["Popular in your library"])])).toBe(
      "what's popular in your library",
    );
  });

  it("combines the request, preferences, and loan history", () => {
    expect(
      recommendationBasis(
        profile,
        [
          book(['Matches "sci-fi"', "Matches your interest in Fantasy"]),
          book(["Similar to Dune, which you borrowed"]),
        ],
        "sci-fi",
        true,
      ),
    ).toBe('your request for "sci-fi", your interest in Fantasy, History and books you\'ve borrowed before');
  });

  it("is empty when there is nothing to recommend", () => {
    expect(recommendationBasis(profile, [])).toBe("");
  });
});

describe("findRecommendations", () => {
  const db = createDb(env.DATABASE_URL);
  const tag = Date.now();
  let orgId: string;
  let memberId: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const [org] = await db.insert(organizations).values({ name: `Rec Org ${tag}` }).returning();
    orgId = org!.id;
    const rows = await db
      .insert(books)
      .values(
        [
          ["read", "Already Read Fantasy", 2],
          ["fantasy", "Dragon Fantasy", 2],
          ["outFantasy", "Out Of Stock Fantasy", 0],
          ["sameGenre", "Another Space Opera", 1],
          ["focus", "Cozy Mystery Pick", 1],
        ].map(([key, title, available]) => ({
          organizationId: orgId,
          title: title as string,
          author: key === "read" ? "Ada Author" : "Someone",
          isbn: `rec-${key}-${tag}`,
          genre: key === "read" ? "Space opera" : null,
          totalCopies: 2,
          availableCopies: available as number,
        })),
      )
      .returning();
    for (const row of rows) ids[row.isbn.split("-")[1]!] = row.id;

    const [member] = await db
      .insert(members)
      .values({ organizationId: orgId, name: "Rec", email: `rec-${tag}@libra.local`, membershipDate: "2026-01-01" })
      .returning();
    memberId = member!.id;
    await db.insert(memberPreferences).values({ memberId, category: "genres", tag: "fantasy" });
    await db.insert(loans).values({ bookId: ids.read!, memberId, dueDate: "2026-01-15", status: "returned" });
  });

  afterAll(async () => {
    await db.delete(loans).where(eq(loans.memberId, memberId));
    await db.delete(members).where(eq(members.id, memberId));
    await db.delete(books).where(inArray(books.id, Object.values(ids)));
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  /** Fake catalog search: maps a query to the books it "finds". */
  function search(byQuery: Record<string, string[]>) {
    return async ({ query }: { query: string }): Promise<SearchCatalogResult> => ({
      relevantContext: (byQuery[query] ?? []).map((key) => ({
        bookId: ids[key]!,
        title: key,
        author: "x",
      })),
      sources: [],
    });
  }

  it("ranks by preferences and history, skips borrowed books, and puts available books first", async () => {
    const { recommendations, profile } = await findRecommendations({
      db,
      orgId,
      memberId,
      search: search({
        Fantasy: ["read", "fantasy", "outFantasy"],
        "Space opera": ["sameGenre"],
      }),
    });

    expect(profile.preferences).toEqual(["Fantasy"]);
    expect(recommendations.map((book) => book.title)).toEqual([
      "Dragon Fantasy",
      "Another Space Opera",
      "Out Of Stock Fantasy",
    ]);
    expect(recommendations[0]!.reasons).toEqual(["Matches your interest in Fantasy"]);
    expect(recommendations[1]!.reasons).toEqual([
      "Similar to Already Read Fantasy, which you borrowed",
    ]);
  });

  it("narrows to the user's request, using the profile only to re-rank", async () => {
    const { recommendations, focusMatched } = await findRecommendations({
      db,
      orgId,
      memberId,
      focus: "cozy mystery",
      search: search({ "cozy mystery": ["sameGenre", "focus"], Fantasy: ["focus", "fantasy"] }),
    });
    expect(focusMatched).toBe(true);
    expect(recommendations.map((book) => book.title)).toEqual([
      "Another Space Opera",
      "Cozy Mystery Pick",
    ]);
    expect(recommendations[1]!.reasons).toEqual([
      'Matches "cozy mystery"',
      "Matches your interest in Fantasy",
    ]);
  });

  it("falls back to profile picks when nothing matches the request", async () => {
    const { recommendations, focusMatched } = await findRecommendations({
      db,
      orgId,
      memberId,
      focus: "underwater basket weaving",
      search: search({ Fantasy: ["fantasy"] }),
    });
    expect(focusMatched).toBe(false);
    expect(recommendations.map((book) => book.title)).toEqual(["Dragon Fantasy"]);
  });

  it("falls back to the library's most borrowed books without a profile or request", async () => {
    const { recommendations } = await findRecommendations({ db, orgId, search: search({}) });
    expect(recommendations).toEqual([
      expect.objectContaining({ title: "Already Read Fantasy", reasons: ["Popular in your library"] }),
    ]);
  });
});
