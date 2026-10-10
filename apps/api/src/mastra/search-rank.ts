import {
  KEYWORD_MIN_SCORE,
  RELATIVE_SCORE_RATIO,
  RRF_K,
  RRF_MIN_SCORE,
  SEARCH_TOP_K,
  SEMANTIC_ONLY_MIN_SCORE,
  VECTOR_MIN_SCORE,
} from "./constants.js";
import {
  catalogSearchTerms,
  isbnDigits,
  normalizeRetrievalQuery,
} from "./search-query.js";

export type SearchMatchType =
  | "title"
  | "author"
  | "isbn"
  | "keyword"
  | "semantic";

export type RankableHit = {
  bookId: string;
  title: string;
  author: string;
  isbn?: string | null;
  genre?: string | null;
  publishedYear?: number | null;
  text?: string;
  keywordScore?: number;
  vectorScore?: number;
};

export type FusedSearchHit = RankableHit & {
  score: number;
  matchType: SearchMatchType;
};

export function rrfScore(ranks: number[], k: number = RRF_K): number {
  return ranks.reduce((sum, rank) => sum + 1 / (k + rank), 0);
}

function compactIsbn(value: string): string {
  return value.replace(/[-\s]/g, "").toLowerCase();
}

export function exactMatchBoost(query: string, hit: RankableHit): number {
  const normalized = normalizeRetrievalQuery(query).toLowerCase();
  const terms = catalogSearchTerms(query).map((term) => term.toLowerCase());
  const title = hit.title.trim().toLowerCase();
  const titleNorm = normalizeRetrievalQuery(hit.title).toLowerCase();
  const author = hit.author.trim().toLowerCase();
  const hitIsbn = hit.isbn ? compactIsbn(hit.isbn) : "";
  const queryIsbn = isbnDigits(query)?.toLowerCase() ?? null;

  if (queryIsbn && hitIsbn && queryIsbn === hitIsbn) {
    return 2;
  }
  if (hitIsbn && normalized && compactIsbn(normalized) === hitIsbn) {
    return 2;
  }
  if (normalized && (title === normalized || titleNorm === normalized)) {
    return 2;
  }
  if (terms.length > 0 && terms.every((term) => author.includes(term))) {
    return 1.5;
  }
  if (normalized && author === normalized) {
    return 1.5;
  }
  if (terms.length > 0 && terms.every((term) => title.includes(term))) {
    return 1;
  }
  return 0;
}

export function matchTypeFor(query: string, hit: RankableHit): SearchMatchType {
  const boost = exactMatchBoost(query, hit);
  if (boost >= 2) {
    return isbnDigits(query) ? "isbn" : "title";
  }
  if (boost >= 1.5) {
    return "author";
  }
  if ((hit.keywordScore ?? 0) > 0) {
    return "keyword";
  }
  return "semantic";
}

export function confirmsKeywordHit(query: string, hit: RankableHit): boolean {
  return exactMatchBoost(query, hit) > 0 || (hit.keywordScore ?? 0) >= KEYWORD_MIN_SCORE;
}

function passesPrecisionGate(
  query: string,
  hit: FusedSearchHit,
  inKeyword: boolean,
  inVector: boolean,
): boolean {
  if (inVector && !inKeyword) {
    return (hit.vectorScore ?? 0) >= SEMANTIC_ONLY_MIN_SCORE;
  }
  if (inKeyword && !inVector) {
    return confirmsKeywordHit(query, hit);
  }
  return true;
}

function mergeHits(left: RankableHit, right: RankableHit): RankableHit {
  return {
    ...left,
    ...right,
    keywordScore: left.keywordScore ?? right.keywordScore,
    vectorScore: left.vectorScore ?? right.vectorScore,
  };
}

export function fuseSearchHits(input: {
  query: string;
  keywordHits: RankableHit[];
  vectorHits: RankableHit[];
  topK?: number;
  minScore?: number;
}): FusedSearchHit[] {
  const keywordRanks = new Map<string, number>();
  for (const [index, hit] of input.keywordHits.entries()) {
    if (hit.bookId) {
      keywordRanks.set(hit.bookId, index + 1);
    }
  }

  const usableVectorHits = input.vectorHits.filter(
    (hit) => (hit.vectorScore ?? 0) >= VECTOR_MIN_SCORE,
  );
  const vectorRanks = new Map<string, number>();
  for (const [index, hit] of usableVectorHits.entries()) {
    if (hit.bookId) {
      vectorRanks.set(hit.bookId, index + 1);
    }
  }

  const byId = new Map<string, RankableHit>();
  for (const hit of [...input.keywordHits, ...usableVectorHits]) {
    if (!hit.bookId) continue;
    const existing = byId.get(hit.bookId);
    byId.set(hit.bookId, existing ? mergeHits(existing, hit) : { ...hit });
  }

  const fused = [...byId.values()].map((hit) => {
    const ranks: number[] = [];
    const keywordRank = keywordRanks.get(hit.bookId);
    const vectorRank = vectorRanks.get(hit.bookId);
    if (keywordRank !== undefined) ranks.push(keywordRank);
    if (vectorRank !== undefined) ranks.push(vectorRank);
    const score = rrfScore(ranks) + exactMatchBoost(input.query, hit);
    return {
      ...hit,
      score,
      matchType: matchTypeFor(input.query, hit),
    };
  });

  const minScore = input.minScore ?? RRF_MIN_SCORE;
  const ranked = fused
    .filter((hit) => hit.score >= minScore)
    .filter((hit) =>
      passesPrecisionGate(
        input.query,
        hit,
        keywordRanks.has(hit.bookId),
        vectorRanks.has(hit.bookId),
      ),
    )
    .sort((left, right) => right.score - left.score);

  const bestScore = ranked[0]?.score ?? 0;
  const relativeCutoff = bestScore * RELATIVE_SCORE_RATIO;
  return ranked
    .filter((hit) => hit.score >= relativeCutoff)
    .slice(0, input.topK ?? SEARCH_TOP_K);
}
