import { apiFetch } from "./api";
import type { ChatBook } from "./chat";

export type RecommendedBook = ChatBook & { reasons: string[] };

export type MemberRecommendations = {
  generatedAt: string;
  nextRefreshAt: string;
  summary: string | null;
  books: RecommendedBook[];
};

export function fetchRecommendations(
  fetchJson: typeof apiFetch = apiFetch,
): Promise<MemberRecommendations> {
  return fetchJson<MemberRecommendations>("/recommendations");
}

/** "New picks in 3 days" / "New picks tomorrow" / "New picks on your next visit". */
export function nextPicksLabel(nextRefreshAt: string, now: number = Date.now()): string {
  const days = Math.ceil((new Date(nextRefreshAt).getTime() - now) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "New picks on your next visit";
  if (days === 1) return "New picks tomorrow";
  return `New picks in ${days} days`;
}
