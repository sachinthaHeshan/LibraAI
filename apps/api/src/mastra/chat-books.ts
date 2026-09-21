export type ChatBook = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string | null;
  description: string | null;
  publishedYear: number | null;
  totalCopies: number;
  availableCopies: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function extractBookIdsFromToolResults(
  toolResults: Array<{ name?: string; result?: unknown; payload?: unknown }>,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  function add(id: string) {
    if (!isUuid(id) || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  }

  function walk(value: unknown) {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    if (typeof record.bookId === "string") add(record.bookId);
    if (
      typeof record.id === "string" &&
      (typeof record.title === "string" || typeof record.author === "string")
    ) {
      add(record.id);
    }
    if (record.book) walk(record.book);
    if (record.result) walk(record.result);
    if (record.payload) walk(record.payload);
    if (record.relevantContext) walk(record.relevantContext);
    if (record.sources) walk(record.sources);
  }

  for (const tool of toolResults) {
    walk(tool);
  }

  return ids;
}
