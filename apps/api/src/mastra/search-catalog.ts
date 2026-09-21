import { books, type Db } from "@libra/db";
import { and, eq, ilike, or } from "drizzle-orm";
import {
  BOOK_EMBEDDINGS_INDEX,
  SEARCH_TOP_K,
} from "./constants.js";
import {
  bookEmbeddingProviderOptions,
  getBookEmbeddingModel,
} from "./embedder.js";
import { catalogVectorFilter } from "./request-org.js";
import { getPgVector } from "./vector.js";

export type BookSearchHit = {
  bookId: string;
  title: string;
  author: string;
  isbn?: string | null;
  genre?: string | null;
  publishedYear?: number | null;
  text?: string;
};

export type SearchCatalogResult = {
  relevantContext: BookSearchHit[];
  sources: unknown[];
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "have",
  "does",
  "did",
  "you",
  "are",
  "was",
  "were",
  "but",
  "not",
  "our",
  "your",
  "this",
  "that",
  "with",
  "from",
  "like",
  "find",
  "book",
  "books",
  "title",
  "about",
  "something",
  "recommend",
  "please",
  "what",
  "do",
  "we",
]);

export function catalogSearchTerms(query: string): string[] {
  const trimmed = query.trim();
  const terms = new Set<string>();
  if (trimmed) {
    terms.add(trimmed);
  }
  for (const part of trimmed.split(/[^\p{L}\p{N}]+/u)) {
    if (part.length >= 3 && !STOPWORDS.has(part.toLowerCase())) {
      terms.add(part);
    }
  }
  return [...terms];
}

function toHit(book: {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string | null;
  description: string | null;
  publishedYear: number | null;
}): BookSearchHit {
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: book.genre,
    publishedYear: book.publishedYear,
    text: book.description ?? undefined,
  };
}

export function mergeSearchHits(...groups: BookSearchHit[][]): BookSearchHit[] {
  const seen = new Set<string>();
  const merged: BookSearchHit[] = [];
  for (const group of groups) {
    for (const hit of group) {
      if (!hit.bookId || seen.has(hit.bookId)) continue;
      seen.add(hit.bookId);
      merged.push(hit);
    }
  }
  return merged.slice(0, SEARCH_TOP_K);
}

export async function keywordSearchBooks(
  db: Db,
  orgId: string,
  query: string,
): Promise<BookSearchHit[]> {
  const terms = catalogSearchTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const termFilters = terms.flatMap((term) => {
    const pattern = `%${term}%`;
    return [
      ilike(books.title, pattern),
      ilike(books.author, pattern),
      ilike(books.isbn, pattern),
      ilike(books.genre, pattern),
      ilike(books.description, pattern),
    ];
  });

  const rows = await db.query.books.findMany({
    where: and(eq(books.organizationId, orgId), or(...termFilters)),
    limit: SEARCH_TOP_K,
  });

  return rows.map(toHit);
}

let vectorSearchUnavailable = false;

function isMissingVectorExtension(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('could not access file "vector"');
}

export async function vectorSearchBooks(
  query: string,
  orgId: string,
): Promise<BookSearchHit[]> {
  if (vectorSearchUnavailable) {
    return [];
  }

  try {
    const embedded = await getBookEmbeddingModel().doEmbed({
      values: [query],
      providerOptions: bookEmbeddingProviderOptions,
    });
    const vector = embedded.embeddings[0];
    if (!vector) {
      return [];
    }

    const results = await getPgVector().query({
      indexName: BOOK_EMBEDDINGS_INDEX,
      queryVector: vector,
      topK: SEARCH_TOP_K,
      filter: catalogVectorFilter(orgId),
      minScore: 0.25,
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

  const keywordHits = await keywordSearchBooks(input.db, input.orgId, input.query);

  return {
    relevantContext: mergeSearchHits(vectorHits, keywordHits),
    sources: [],
  };
}
