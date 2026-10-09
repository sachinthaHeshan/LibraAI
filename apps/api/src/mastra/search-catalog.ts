import { bookApiColumns, books, type Db } from "@libra/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import {
  BOOK_EMBEDDINGS_INDEX,
  SEARCH_CANDIDATE_K,
  VECTOR_MIN_SCORE,
} from "./constants.js";
import {
  bookEmbeddingProviderOptions,
  getBookEmbeddingModel,
} from "./embedder.js";
import { catalogVectorFilter } from "./request-org.js";
import { fuseSearchHits, type SearchMatchType } from "./search-rank.js";
import {
  isbnDigits,
  normalizeRetrievalQuery,
  retrievalQueryForFts,
} from "./search-query.js";
import { getPgVector } from "./vector.js";

export type BookSearchHit = {
  bookId: string;
  title: string;
  author: string;
  isbn?: string | null;
  genre?: string | null;
  publishedYear?: number | null;
  text?: string;
  keywordScore?: number;
  vectorScore?: number;
  score?: number;
  matchType?: SearchMatchType;
};

export type SearchCatalogResult = {
  relevantContext: BookSearchHit[];
  sources: unknown[];
};

export type CatalogBookRecord = {
  id: string;
  organizationId: string;
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  publishedYear: number | null;
  genre: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toHit(book: {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string | null;
  description: string | null;
  publishedYear: number | null;
  keywordScore?: number;
}): BookSearchHit {
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: book.genre,
    publishedYear: book.publishedYear,
    text: book.description ?? undefined,
    keywordScore: book.keywordScore,
  };
}

export async function searchBooksFts(
  db: Db,
  orgId: string,
  query: string,
): Promise<Array<CatalogBookRecord & { keywordScore: number }>> {
  const trimmed = query.trim();
  const ftsQuery = retrievalQueryForFts(query);
  const isbn = isbnDigits(query);
  if (!ftsQuery && !isbn && !trimmed) {
    return [];
  }

  const englishQuery = ftsQuery
    ? sql`websearch_to_tsquery('english', ${ftsQuery})`
    : null;
  const simpleQuery = ftsQuery
    ? sql`plainto_tsquery('simple', ${ftsQuery})`
    : isbn
      ? sql`plainto_tsquery('simple', ${isbn})`
      : null;

  const ftsMatch = [englishQuery, simpleQuery]
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .map((tsquery) => sql`${books.searchVector} @@ ${tsquery}`);

  const match = sql`(${sql.join(
    [
      ...ftsMatch,
      sql`${books.isbn} = ${trimmed}`,
      ...(isbn ? [sql`${books.isbn} = ${isbn}`] : []),
    ],
    sql` OR `,
  )})`;

  const rankParts = [englishQuery, simpleQuery]
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .map((tsquery) => sql`ts_rank_cd(${books.searchVector}, ${tsquery}, 32)`);
  const textRank =
    rankParts.length > 1
      ? sql`GREATEST(${sql.join(rankParts, sql`, `)})`
      : rankParts[0] ?? sql`0`;
  const rank = sql`(CASE WHEN ${books.isbn} = ${trimmed} OR ${books.isbn} = ${isbn ?? trimmed} THEN 1 ELSE ${textRank} END)`;

  return db
    .select({
      ...bookApiColumns,
      keywordScore: sql<number>`${rank}`.as("keyword_score"),
    })
    .from(books)
    .where(and(eq(books.organizationId, orgId), match))
    .orderBy(sql`${rank} DESC`)
    .limit(SEARCH_CANDIDATE_K);
}

/** Escapes LIKE wildcards so user input like "50%" or "a_b" matches literally. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/**
 * Catalog list for the books screen: case-insensitive substring (ILIKE) match on
 * title, author, ISBN, genre, and description, ranked so title hits come first.
 */
export async function listCatalogBooks(
  db: Db,
  orgId: string,
  query?: string,
): Promise<CatalogBookRecord[]> {
  const term = query?.trim().replace(/\s+/g, " ") ?? "";
  if (!term) {
    return db
      .select(bookApiColumns)
      .from(books)
      .where(eq(books.organizationId, orgId));
  }

  const pattern = likePattern(term);
  const isbn = isbnDigits(term);
  const isbnMatch = isbn
    ? sql`replace(${books.isbn}, '-', '') ILIKE ${likePattern(isbn)}`
    : sql`${books.isbn} ILIKE ${pattern}`;
  const rank = sql`CASE
    WHEN lower(${books.title}) = lower(${term}) THEN 0
    WHEN ${books.title} ILIKE ${pattern} THEN 1
    WHEN ${books.author} ILIKE ${pattern} THEN 2
    WHEN ${isbnMatch} THEN 3
    WHEN ${books.genre} ILIKE ${pattern} THEN 4
    ELSE 5
  END`;

  return db
    .select(bookApiColumns)
    .from(books)
    .where(
      and(
        eq(books.organizationId, orgId),
        or(
          ilike(books.title, pattern),
          ilike(books.author, pattern),
          isbnMatch,
          ilike(books.genre, pattern),
          ilike(books.description, pattern),
        ),
      ),
    )
    .orderBy(rank, books.title);
}

export async function keywordSearchBooks(
  db: Db,
  orgId: string,
  query: string,
): Promise<BookSearchHit[]> {
  const rows = await searchBooksFts(db, orgId, query);
  return rows.map(toHit);
}

let vectorSearchUnavailable = false;

function isMissingVectorExtension(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('could not access file "vector"');
}

function vectorRowScore(row: { score?: unknown; similarity?: unknown }): number | undefined {
  if (typeof row.score === "number") {
    return row.score;
  }
  if (typeof row.similarity === "number") {
    return row.similarity;
  }
  return undefined;
}

export async function vectorSearchBooks(
  query: string,
  orgId: string,
): Promise<BookSearchHit[]> {
  if (vectorSearchUnavailable) {
    return [];
  }

  const retrievalQuery = normalizeRetrievalQuery(query) || query.trim();
  if (!retrievalQuery) {
    return [];
  }

  try {
    const embedded = await getBookEmbeddingModel().doEmbed({
      values: [retrievalQuery],
      providerOptions: bookEmbeddingProviderOptions,
    });
    const vector = embedded.embeddings[0];
    if (!vector) {
      return [];
    }

    const results = await getPgVector().query({
      indexName: BOOK_EMBEDDINGS_INDEX,
      queryVector: vector,
      topK: SEARCH_CANDIDATE_K,
      filter: catalogVectorFilter(orgId),
      minScore: VECTOR_MIN_SCORE,
    });

    return results.flatMap((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      const bookId =
        typeof metadata.bookId === "string" ? metadata.bookId : undefined;
      const title = typeof metadata.title === "string" ? metadata.title : undefined;
      if (!bookId || !title) {
        return [];
      }
      return [
        {
          bookId,
          title,
          author: typeof metadata.author === "string" ? metadata.author : "",
          isbn: typeof metadata.isbn === "string" ? metadata.isbn : undefined,
          genre:
            typeof metadata.genre === "string" || metadata.genre === null
              ? (metadata.genre as string | null)
              : undefined,
          publishedYear:
            typeof metadata.publishedYear === "number"
              ? metadata.publishedYear
              : undefined,
          text: typeof metadata.text === "string" ? metadata.text : undefined,
          vectorScore: vectorRowScore(row),
        },
      ];
    });
  } catch (error) {
    if (isMissingVectorExtension(error)) {
      vectorSearchUnavailable = true;
    }
    console.error("Vector book search failed", error);
    return [];
  }
}

export async function searchCatalogBooks(input: {
  db: Db;
  orgId: string;
  query: string;
  vectorSearch?: (query: string, orgId: string) => Promise<BookSearchHit[]>;
  keywordSearch?: (
    db: Db,
    orgId: string,
    query: string,
  ) => Promise<BookSearchHit[]>;
}): Promise<SearchCatalogResult> {
  let vectorHits: BookSearchHit[] = [];
  try {
    vectorHits = await (input.vectorSearch ?? vectorSearchBooks)(
      input.query,
      input.orgId,
    );
  } catch (error) {
    console.error("Vector book search failed", error);
  }

  const keywordHits = await (input.keywordSearch ?? keywordSearchBooks)(
    input.db,
    input.orgId,
    input.query,
  );

  return {
    relevantContext: fuseSearchHits({
      query: input.query,
      keywordHits,
      vectorHits,
    }),
    sources: [],
  };
}
