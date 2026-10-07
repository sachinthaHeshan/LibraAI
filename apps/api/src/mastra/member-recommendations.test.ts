import { books, createDb, memberPreferences, members, organizations } from "@libra/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env } from "../env.js";
import {
  RECOMMENDATION_COUNT,
  getMemberRecommendations,
  type RecommendationGenerator,
} from "./member-recommendations.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("getMemberRecommendations", () => {
  const db = createDb(env.DATABASE_URL);
  const tag = Date.now();
  let orgId: string;
  let memberId: string;
  let bookIds: string[] = [];

  beforeAll(async () => {
    const [org] = await db.insert(organizations).values({ name: `Recs ${tag}` }).returning();
    orgId = org!.id;
    const rows = await db
      .insert(books)
      .values(
        Array.from({ length: 12 }, (_, index) => ({
          organizationId: orgId,
          title: `Rec Book ${index}`,
          author: "Author",
          isbn: `recs-${tag}-${index}`,
          totalCopies: 1,
          availableCopies: 1,
        })),
      )
      .returning();
    bookIds = rows.map((row) => row.id);
    const [member] = await db
      .insert(members)
      .values({ organizationId: orgId, name: "R", email: `recs-${tag}@libra.local`, membershipDate: "2026-01-01" })
      .returning();
    memberId = member!.id;
  });

  afterAll(async () => {
    await db.delete(members).where(eq(members.id, memberId));
    await db.delete(books).where(eq(books.organizationId, orgId));
    await db.delete(organizations).where(eq(organizations.id, orgId));
  });

  /** Fake agent: recommends the first catalog books that aren't excluded. */
  function fakeGenerator() {
    return vi.fn<RecommendationGenerator>(async ({ exclude }) => ({
      summary: "Picked for you.",
      recommendations: bookIds
        .filter((id) => !exclude.includes(id))
        .slice(0, RECOMMENDATION_COUNT)
        .map((bookId) => ({
          bookId,
          title: "",
          author: "",
          genre: null,
          availableCopies: 1,
          reasons: ["Popular in your library"],
        })),
    }));
  }

  const ids = (result: { books: Array<{ id: string }> }) => result.books.map((book) => book.id);

  it("generates five books on first use, reuses them for five days, then picks five new ones", async () => {
    const start = new Date("2026-10-01T09:00:00.000Z");
    const generate = fakeGenerator();

    const first = await getMemberRecommendations({ db, orgId, memberId, now: start, generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]![0].exclude).toEqual([]);
    expect(ids(first)).toEqual(bookIds.slice(0, 5));
    expect(first).toMatchObject({
      summary: "Picked for you.",
      generatedAt: start.toISOString(),
      nextRefreshAt: new Date(start.getTime() + 5 * DAY_MS).toISOString(),
    });
    expect(first.books[0]).toMatchObject({ title: "Rec Book 0", reasons: ["Popular in your library"] });

    const fourDaysLater = new Date(start.getTime() + 4 * DAY_MS);
    const cached = await getMemberRecommendations({ db, orgId, memberId, now: fourDaysLater, generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(ids(cached)).toEqual(ids(first));

    const sixDaysLater = new Date(start.getTime() + 6 * DAY_MS);
    const refreshed = await getMemberRecommendations({ db, orgId, memberId, now: sixDaysLater, generate });
    expect(generate).toHaveBeenCalledTimes(2);
    expect([...generate.mock.calls[1]![0].exclude].sort()).toEqual(ids(first).sort());
    expect(ids(refreshed)).toEqual(bookIds.slice(5, 10));
    expect(ids(refreshed).some((id) => ids(first).includes(id))).toBe(false);
  }, 20_000);

  it("refills from older picks, but never the last batch, when the catalog runs out", async () => {
    // 12 books, 10 already recommended: only 2 unseen remain.
    const generate = fakeGenerator();
    const later = new Date("2026-10-20T09:00:00.000Z");
    const result = await getMemberRecommendations({ db, orgId, memberId, now: later, generate });

    expect(result.books).toHaveLength(5);
    expect(ids(result).slice(0, 2)).toEqual(bookIds.slice(10, 12));
    expect(ids(result).some((id) => bookIds.slice(5, 10).includes(id))).toBe(false);
  }, 20_000);

  it("tops up a short list with other catalog books before repeating old picks", async () => {
    const [other] = await db
      .insert(members)
      .values({ organizationId: orgId, name: "S", email: `recs-short-${tag}@libra.local`, membershipDate: "2026-01-01" })
      .returning();
    const generate = vi.fn<RecommendationGenerator>(async () => ({
      summary: null,
      recommendations: [
        { bookId: bookIds[3]!, title: "", author: "", genre: null, availableCopies: 1, reasons: ["Matches"] },
      ],
    }));
    try {
      const result = await getMemberRecommendations({ db, orgId, memberId: other!.id, generate });
      expect(result.books).toHaveLength(5);
      expect(result.books[0]).toMatchObject({ id: bookIds[3], reasons: ["Matches"] });
      expect(new Set(ids(result)).size).toBe(5);
      expect(result.books.slice(1).every((book) => book.reasons[0] === "Something new to explore")).toBe(true);
      expect(result.summary).toBe(
        "Picks that match your interests, plus other books from the library you haven't seen yet.",
      );
    } finally {
      await db.delete(members).where(eq(members.id, other!.id));
    }
  }, 20_000);

  it("regenerates early when the member changes their preferences", async () => {
    const generate = fakeGenerator();
    const now = new Date("2026-10-21T09:00:00.000Z");
    await getMemberRecommendations({ db, orgId, memberId, now, generate });
    expect(generate).not.toHaveBeenCalled();

    await db.insert(memberPreferences).values({ memberId, category: "genres", tag: "fantasy", createdAt: new Date("2026-10-21T08:00:00.000Z") });
    await db.update(memberPreferences).set({ createdAt: new Date("2026-10-21T10:00:00.000Z") }).where(eq(memberPreferences.memberId, memberId));
    await getMemberRecommendations({ db, orgId, memberId, now, generate });
    expect(generate).toHaveBeenCalledTimes(1);
  }, 20_000);
});
