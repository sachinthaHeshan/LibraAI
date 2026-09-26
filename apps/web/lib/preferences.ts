import { apiFetch } from "./api";
import { getTokenRole } from "./auth";

export type PreferenceTag = { id: string; label: string };

export type PreferenceCategory = {
  id: string;
  label: string;
  tags: PreferenceTag[];
};

export type Preferences = {
  categories: PreferenceCategory[];
  selected: string[];
};

export function fetchPreferences(fetchJson: typeof apiFetch = apiFetch): Promise<Preferences> {
  return fetchJson<Preferences>("/preferences");
}

export async function savePreferences(
  tags: string[],
  fetchJson: typeof apiFetch = apiFetch,
): Promise<string[]> {
  const { selected } = await fetchJson<{ selected: string[] }>("/preferences", {
    method: "PUT",
    body: JSON.stringify({ tags }),
  });
  return selected;
}

export function toggleTag(selected: string[], tag: string): string[] {
  return selected.includes(tag)
    ? selected.filter((item) => item !== tag)
    : [...selected, tag];
}

/** Where to go after signing in: members without saved preferences pick them first. */
export async function pathAfterSignIn(
  token: string,
  fetchJson: typeof apiFetch = apiFetch,
): Promise<string> {
  if (getTokenRole(token) !== "member") return "/overview";
  try {
    const { selected } = await fetchPreferences(fetchJson);
    return selected.length === 0 ? "/preferences" : "/overview";
  } catch {
    return "/overview";
  }
}

export function tagLabel(categories: PreferenceCategory[], tagId: string): string {
  for (const category of categories) {
    const tag = category.tags.find((item) => item.id === tagId);
    if (tag) return tag.label;
  }
  return tagId;
}

export function sameTags(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((tag) => right.includes(tag));
}
