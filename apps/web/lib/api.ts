import { clearToken, getToken } from "./auth";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${path}`,
    { ...init, headers },
  );

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = new URL("/login", window.location.origin).href;
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
