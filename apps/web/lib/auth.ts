const TOKEN_KEY = "libra_token";

export type AccountRole = "owner" | "member";

export function getToken(): string | null {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Role claim from the JWT, for showing the right UI. The API enforces access. */
export function getTokenRole(token: string | null = getToken()): AccountRole | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1] ?? "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const role = (JSON.parse(json) as { role?: unknown }).role;
    return role === "member" ? "member" : "owner";
  } catch {
    return null;
  }
}
