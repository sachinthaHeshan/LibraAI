import { books, loans, memberPreferences, type Db } from "@libra/db";
import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import { PREFERENCE_CATALOG } from "../lib/preference-catalog.js";
import { searchCatalogBooks, type SearchCatalogResult } from "./search-catalog.js";

export type ReadingProfile = {
  preferences: string[];
  history: Array<{ bookId: string; title: string; author: string; genre: string | null }>;
};

export type RecommendationQuery = {
  query: string;
  reason: string;
  weight: number;
};

export type Recommendation = {
  bookId: string;
  title: string;
  author: string;
  genre: string | null;
  availableCopies: number;
  reasons: string[];
};

type CatalogSearch = (input: { db: Db; orgId: string; query: string }) => Promise<SearchCatalogResult>;

const MAX_PREFERENCE_QUERIES = 6;
const MAX_HISTORY_GENRES = 3;
const MAX_HISTORY_AUTHORS = 2;
const HISTORY_LIMIT = 20;
const HITS_PER_QUERY = 5;
const MAX_REASONS = 2;

const tagLabels = new Map(
  PREFERENCE_CATALOG.flatMap((category) => category.tags.map((tag) => [tag.id, tag.label] as const)),
);

export async function loadReadingProfile(
  db: Db,
  orgId: string,
  memberId: string,
): Promise<ReadingProfile> {
  const [preferenceRows, historyRows] = await Promise.all([
    db
      .select({ tag: memberPreferences.tag })
      .from(memberPreferences)
      .where(eq(memberPreferences.memberId, memberId)),
    db
      .select({ bookId: books.id, title: books.title, author: books.author, genre: books.genre })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(and(eq(loans.memberId, memberId), eq(books.organizationId, orgId)))
      .orderBy(desc(loans.issuedAt))
      .limit(HISTORY_LIMIT),
  ]);

  return {
    preferences: preferenceRows.flatMap((row) => tagLabels.get(row.tag) ?? []),
    history: historyRows,
  };
}

function distinct<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item).toLowerCase();
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/** What to search the catalog for. The user's own request outweighs their saved profile. */
export function recommendationQueries(profile: ReadingProfile, focus?: string): RecommendationQuery[] {
  const trimmedFocus = focus?.trim();
  const profileWeight = trimmedFocus ? 0.5 : 1;
  const queries: RecommendationQuery[] = [];

  if (trimmedFocus) {
    queries.push({ query: trimmedFocus, reason: `Matches "${trimmedFocus}"`, weight: 3 });
  }
  for (const label of profile.preferences.slice(0, MAX_PREFERENCE_QUERIES)) {
    queries.push({ query: label, reason: `Matches your interest in ${label}`, weight: profileWeight });
  }
  const withGenre = profile.history.filter((loan) => loan.genre?.trim());
  for (const loan of distinct(withGenre, (loan) => loan.genre!).slice(0, MAX_HISTORY_GENRES)) {
    queries.push({
      query: loan.genre!,
      reason: `Similar to ${loan.title}, which you borrowed`,
      weight: profileWeight * 0.8,
    });
  }
  for (const loan of distinct(profile.history, (loan) => loan.author).slice(0, MAX_HISTORY_AUTHORS)) {
    queries.push({
      query: loan.author,
      reason: `By ${loan.author}, whose books you've borrowed`,
      weight: profileWeight * 0.6,
    });
  }

  return distinct(queries, (query) => query.query);
}

async function mostBorrowedBooks(db: Db, orgId: string, limit: number) {
  const rows = await db
    .select({ bookId: loans.bookId, borrows: count() })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .where(eq(books.organizationId, orgId))
    .groupBy(loans.bookId)
    .orderBy(desc(count()))
    .limit(limit);
  return rows.map((row) => row.bookId);
}

/** Plain-language summary of what the picks are based on, e.g. "your interest in Fantasy and your past loans". */
export function recommendationBasis(
  profile: ReadingProfile,
  recommendations: Recommendation[],
  focus?: string,
  focusMatched?: boolean,
): string {
  if (recommendations.length === 0) return "";
  const reasons = recommendations.flatMap((book) => book.reasons);
  if (reasons.every((reason) => reason === "Popular in your library")) {
    return "what's popular in your library";
  }
  const parts: string[] = [];
  if (focus?.trim() && focusMatched) parts.push(`your request for "${focus.trim()}"`);
  if (reasons.some((reason) => reason.startsWith("Matches your interest"))) {
    parts.push(`your interest in ${profile.preferences.slice(0, 3).join(", ")}`);
  }
  if (reasons.some((reason) => reason.startsWith("Similar to") || reason.startsWith("By "))) {
    parts.push("books you've borrowed before");
  }
  return parts.length > 1
    ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
    : (parts[0] ?? "your library's catalog");
}

/**
 * Books to top up a short list: most borrowed in the library first, then other
 * available books, newest first. Skips anything in `exclude`.
 */
export async function catalogFillers(
  db: Db,
  orgId: string,
  exclude: Set<string>,
  limit: number,
): Promise<Array<{ bookId: string; reasons: string[] }>> {
  if (limit <= 0) return [];
  const fillers: Array<{ bookId: string; reasons: string[] }> = [];
  const taken = new Set(exclude);
  const take = (bookId: string, reason: string) => {
    if (fillers.length >= limit || taken.has(bookId)) return;
    taken.add(bookId);
    fillers.push({ bookId, reasons: [reason] });
  };

  for (const bookId of await mostBorrowedBooks(db, orgId, limit + exclude.size)) {
    take(bookId, "Popular in your library");
  }
  if (fillers.length < limit) {
    const rows = await db
      .select({ bookId: books.id })
      .from(books)
      .where(and(eq(books.organizationId, orgId), gt(books.availableCopies, 0)))
      .orderBy(desc(books.createdAt))
      .limit(limit + taken.size);
    for (const row of rows) take(row.bookId, "Something new to explore");
  }
  return fillers;
}

export async function findRecommendations(input: {
  db: Db;
  orgId: string;
  memberId?: string;
  focus?: string;
  limit?: number;
  /** Book ids to leave out, e.g. ones recommended before. */
  exclude?: Iterable<string>;
  search?: CatalogSearch;
}): Promise<{
  profile: ReadingProfile;
  recommendations: Recommendation[];
  /** Whether anything matched the user's requested focus. Undefined without a focus. */
  focusMatched?: boolean;
}> {
  const limit = input.limit ?? 5;
  const search = input.search ?? searchCatalogBooks;
  const profile = input.memberId
    ? await loadReadingProfile(input.db, input.orgId, input.memberId)
    : { preferences: [], history: [] };
  const alreadyBorrowed = new Set([
    ...profile.history.map((loan) => loan.bookId),
    ...(input.exclude ?? []),
  ]);

  const scores = new Map<string, { score: number; reasons: string[] }>();
  function addCandidate(bookId: string, points: number, reason: string) {
    if (alreadyBorrowed.has(bookId)) return;
    const entry = scores.get(bookId) ?? { score: 0, reasons: [] };
    entry.score += points;
    if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
    scores.set(bookId, entry);
  }

  const queries = recommendationQueries(profile, input.focus);
  const hasFocus = Boolean(input.focus?.trim());
  const focusMatches = new Set<string>();
  const results = await Promise.all(
    queries.map((query) =>
      search({ db: input.db, orgId: input.orgId, query: query.query }).catch(() => null),
    ),
  );
  results.forEach((result, index) => {
    const query = queries[index]!;
    result?.relevantContext
      .filter((hit) => !alreadyBorrowed.has(hit.bookId))
      .slice(0, HITS_PER_QUERY)
      .forEach((hit, rank) => {
        if (hasFocus && index === 0) focusMatches.add(hit.bookId);
        addCandidate(hit.bookId, query.weight / (rank + 1), query.reason);
      });
  });

  // A named genre/topic narrows the picks; the profile only re-ranks them.
  // If nothing matched it, fall back to profile-based picks.
  if (focusMatches.size > 0) {
    for (const bookId of scores.keys()) {
      if (!focusMatches.has(bookId)) scores.delete(bookId);
    }
  }
  const focusMatched = hasFocus ? focusMatches.size > 0 : undefined;

  if (scores.size === 0) {
    const popular = await mostBorrowedBooks(input.db, input.orgId, limit * 3);
    popular.forEach((bookId, rank) => addCandidate(bookId, 1 / (rank + 1), "Popular in your library"));
  }
  if (scores.size === 0) return { profile, recommendations: [], focusMatched };

  const rows = await input.db
    .select({
      bookId: books.id,
      title: books.title,
      author: books.author,
      genre: books.genre,
      availableCopies: books.availableCopies,
    })
    .from(books)
    .where(and(eq(books.organizationId, input.orgId), inArray(books.id, [...scores.keys()])));

  const recommendations = rows
    .map((row) => ({ ...row, ...scores.get(row.bookId)! }))
    .sort(
      (left, right) =>
        Number(right.availableCopies > 0) - Number(left.availableCopies > 0) ||
        right.score - left.score,
    )
    .slice(0, limit)
    .map(({ score: _score, reasons, ...book }) => ({
      ...book,
      reasons: reasons.slice(0, MAX_REASONS),
    }));

  return { profile, recommendations, focusMatched };
}
