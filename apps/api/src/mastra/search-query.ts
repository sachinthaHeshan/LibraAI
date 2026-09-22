const STOPWORDS = new Set([
  "a",
  "an",
  "any",
  "are",
  "available",
  "about",
  "and",
  "be",
  "book",
  "books",
  "but",
  "can",
  "did",
  "do",
  "does",
  "find",
  "for",
  "from",
  "have",
  "how",
  "in",
  "is",
  "it",
  "like",
  "looking",
  "not",
  "of",
  "on",
  "or",
  "our",
  "please",
  "recommend",
  "similar",
  "something",
  "that",
  "the",
  "this",
  "title",
  "to",
  "want",
  "was",
  "we",
  "were",
  "what",
  "where",
  "who",
  "with",
  "you",
  "your",
]);

function queryParts(query: string): string[] {
  return query.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function keepToken(part: string): boolean {
  const lower = part.toLowerCase();
  if (STOPWORDS.has(lower)) {
    return false;
  }
  if (/^\d+$/.test(part)) {
    return part.length >= 1;
  }
  return part.length >= 3;
}

export function normalizeRetrievalQuery(query: string): string {
  return queryParts(query).filter(keepToken).join(" ");
}

export function catalogSearchTerms(query: string): string[] {
  const normalized = normalizeRetrievalQuery(query);
  if (!normalized) {
    return [];
  }
  return [...new Set(normalized.split(/\s+/))];
}

export function isbnDigits(query: string): string | null {
  const compact = query.replace(/[-\s]/g, "");
  if (/^\d{10,13}$/.test(compact) || /^\d{9}[\dXx]$/i.test(compact)) {
    return compact.toUpperCase();
  }
  return null;
}

export function retrievalQueryForFts(query: string): string | null {
  const isbn = isbnDigits(query);
  if (isbn) {
    return isbn;
  }
  const normalized = normalizeRetrievalQuery(query);
  return normalized.length > 0 ? normalized : null;
}
