const TOKEN_KEY = "libra_token";

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
