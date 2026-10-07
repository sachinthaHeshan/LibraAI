import {
  books,
  loans,
  memberPreferences,
  recommendationBatches,
  recommendationItems,
  type Db,
} from "@libra/db";
import { RequestContext } from "@mastra/core/request-context";
import { and, asc, desc, eq, max } from "drizzle-orm";
import type { ChatBook } from "./chat-books.js";
import { isAiConfigured } from "./google.js";
import { getRecommendationAgent } from "./index.js";
import { catalogFillers, findRecommendations, type Recommendation } from "./recommend.js";
import type { CatalogRequestValues } from "./request-org.js";

export const RECOMMENDATION_COUNT = 5;
export const RECOMMENDATION_REFRESH_DAYS = 5;
export const RECOMMENDATION_PROMPT = `Recommend ${RECOMMENDATION_COUNT} books for me based on my reading preferences and loan history. Reply with one short sentence (under 25 words) saying what the picks are based on. Do not list the books — they are shown as cards.`;

const DAY_MS = 24 * 60 * 60 * 1000;

export type GeneratedRecommendations = {
  summary: string | null;
  recommendations: Recommendation[];
};

export type RecommendationGenerator = (input: {
  db: Db;
  orgId: string;
  memberId: string;
  exclude: string[];
}) => Promise<GeneratedRecommendations>;

export type RecommendedBook = ChatBook & { reasons: string[] };

export type MemberRecommendations = {
  generatedAt: string;
  nextRefreshAt: string;
  summary: string | null;
  books: RecommendedBook[];
};

function recommendationsFromToolResults(results: unknown[]): Recommendation[] | undefined {
  let found: Recommendation[] | undefined;
  for (const item of results) {
    const record = item as { payload?: { result?: unknown }; result?: unknown } | null;
    const result = (record?.payload?.result ?? record?.result) as
      | { recommendations?: unknown }
      | undefined;
    if (Array.isArray(result?.recommendations)) {
      found = result.recommendations as Recommendation[];
    }
  }
  return found;
}

/** Runs the recommendation agent with the fixed overview prompt. */
export const runRecommendationAgent: RecommendationGenerator = async ({
  db,
  orgId,
  memberId,
  exclude,
}) => {
  if (!isAiConfigured()) {
    const { recommendations } = await findRecommendations({ db, orgId, memberId, exclude });
    return { summary: null, recommendations };
  }

  const requestContext = new RequestContext<CatalogRequestValues>([["orgId", orgId]]);
  requestContext.set("memberId", memberId);
  requestContext.set("excludeBookIds", exclude);
  const result = await getRecommendationAgent(db).generate(RECOMMENDATION_PROMPT, {
    requestContext,
  });
  const recommendations =
    recommendationsFromToolResults([
      ...(result.toolResults ?? []),
      ...(result.steps ?? []).flatMap((step) => step.toolResults ?? []),
    ]) ?? (await findRecommendations({ db, orgId, memberId, exclude })).recommendations;

  return { summary: result.text.trim() || null, recommendations };
};

async function latestBatch(db: Db, memberId: string) {
  return db.query.recommendationBatches.findFirst({
    where: eq(recommendationBatches.memberId, memberId),
    orderBy: desc(recommendationBatches.generatedAt),
  });
}

async function preferencesUpdatedAt(db: Db, memberId: string) {
  const [row] = await db
    .select({ value: max(memberPreferences.createdAt) })
    .from(memberPreferences)
    .where(eq(memberPreferences.memberId, memberId));
  return row?.value ?? null;
}

/** Every book recommended to the member before, newest batch first, without duplicates. */
async function previouslyRecommended(db: Db, memberId: string) {
  const rows = await db
    .select({ bookId: recommendationItems.bookId, reasons: recommendationItems.reasons })
    .from(recommendationItems)
    .innerJoin(recommendationBatches, eq(recommendationItems.batchId, recommendationBatches.id))
    .where(eq(recommendationBatches.memberId, memberId))
    .orderBy(desc(recommendationBatches.generatedAt), asc(recommendationItems.position));
  const seen = new Set<string>();
  return rows.filter((row) => !seen.has(row.bookId) && seen.add(row.bookId));
}

async function loadBatch(
  db: Db,
  orgId: string,
  batch: { id: string; summary: string | null; generatedAt: Date },
): Promise<MemberRecommendations> {
  const rows = await db
    .select({ book: books, reasons: recommendationItems.reasons })
    .from(recommendationItems)
    .innerJoin(books, eq(recommendationItems.bookId, books.id))
    .where(and(eq(recommendationItems.batchId, batch.id), eq(books.organizationId, orgId)))
    .orderBy(asc(recommendationItems.position));

  return {
    generatedAt: batch.generatedAt.toISOString(),
    nextRefreshAt: new Date(
      batch.generatedAt.getTime() + RECOMMENDATION_REFRESH_DAYS * DAY_MS,
    ).toISOString(),
    summary: batch.summary,
    books: rows.map(({ book, reasons }) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      genre: book.genre,
      description: book.description,
      publishedYear: book.publishedYear,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      reasons,
    })),
  };
}

async function generateBatch(input: {
  db: Db;
  orgId: string;
  memberId: string;
  now: Date;
  generate: RecommendationGenerator;
  lastBookIds: string[];
}) {
  const { db, orgId, memberId } = input;
  // Never repeat earlier picks. If the agent comes up short, top up with other
  // catalog books; only as a last resort reuse older picks (newest first) —
  // never the batch the member just saw.
  const past = await previouslyRecommended(db, memberId);
  const generated = await input.generate({
    db,
    orgId,
    memberId,
    exclude: past.map((item) => item.bookId),
  });
  const picks = generated.recommendations
    .slice(0, RECOMMENDATION_COUNT)
    .map(({ bookId, reasons }) => ({ bookId, reasons }));
  const agentPickCount = picks.length;

  const borrowed = await db
    .selectDistinct({ bookId: loans.bookId })
    .from(loans)
    .where(eq(loans.memberId, memberId));
  picks.push(
    ...(await catalogFillers(
      db,
      orgId,
      new Set([
        ...past.map((item) => item.bookId),
        ...borrowed.map((row) => row.bookId),
        ...picks.map((pick) => pick.bookId),
      ]),
      RECOMMENDATION_COUNT - picks.length,
    )),
  );

  const skip = new Set([...input.lastBookIds, ...picks.map((pick) => pick.bookId)]);
  for (const item of past) {
    if (picks.length >= RECOMMENDATION_COUNT) break;
    if (!skip.has(item.bookId)) picks.push(item);
  }

  // The agent's summary only describes its own picks; describe the mix instead.
  const summary =
    picks.length > agentPickCount
      ? agentPickCount > 0
        ? "Picks that match your interests, plus other books from the library you haven't seen yet."
        : "Books from the library you haven't seen yet."
      : generated.summary;

  return db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(recommendationBatches)
      .values({ memberId, summary, generatedAt: input.now })
      .returning();
    if (picks.length > 0) {
      await tx.insert(recommendationItems).values(
        picks.map((pick, position) => ({
          batchId: batch!.id,
          bookId: pick.bookId,
          position,
          reasons: pick.reasons,
        })),
      );
    }
    return batch!;
  });
}

const inFlight = new Map<string, Promise<MemberRecommendations>>();

/**
 * The member's "Recommended for you" books. Generates a new batch on first use,
 * when the last one is older than RECOMMENDATION_REFRESH_DAYS, or after preferences change.
 */
export async function getMemberRecommendations(input: {
  db: Db;
  orgId: string;
  memberId: string;
  now?: Date;
  generate?: RecommendationGenerator;
}): Promise<MemberRecommendations> {
  const { db, orgId, memberId } = input;
  const now = input.now ?? new Date();
  const latest = await latestBatch(db, memberId);
  const prefsChangedAt = latest ? await preferencesUpdatedAt(db, memberId) : null;
  const fresh =
    latest &&
    now.getTime() - latest.generatedAt.getTime() < RECOMMENDATION_REFRESH_DAYS * DAY_MS &&
    !(prefsChangedAt && prefsChangedAt > latest.generatedAt);
  if (fresh) {
    return loadBatch(db, orgId, latest);
  }

  const running = inFlight.get(memberId);
  if (running) return running;

  const job = (async () => {
    const lastBookIds = latest
      ? (
          await db
            .select({ bookId: recommendationItems.bookId })
            .from(recommendationItems)
            .where(eq(recommendationItems.batchId, latest.id))
        ).map((row) => row.bookId)
      : [];
    const batch = await generateBatch({
      db,
      orgId,
      memberId,
      now,
      generate: input.generate ?? runRecommendationAgent,
      lastBookIds,
    });
    return loadBatch(db, orgId, batch);
  })().finally(() => inFlight.delete(memberId));
  inFlight.set(memberId, job);
  return job;
}
