import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, publicApiFetch } from "./api";
import { clearToken, getToken, setToken } from "./auth";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("auth token helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores, reads, and clears the auth token", () => {
    expect(getToken()).toBeNull();

    setToken("signed-token");
    expect(getToken()).toBe("signed-token");

    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
    vi.stubGlobal("window", {
      location: { href: "/", origin: "http://localhost:3000" },
    });
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("attaches the stored token and parses JSON responses", async () => {
    setToken("signed-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ title: "Dune" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch<{ title: string }>("/books")).resolves.toEqual({
      title: "Dune",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/backend/books");
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer signed-token",
    );
  });

  it("does not send a JSON content type for a bodyless request", async () => {
    setToken("signed-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: "returned" })));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/loans/loan-id/return", { method: "POST" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("clears auth and redirects to login on unauthorized responses", async () => {
    setToken("expired-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(apiFetch("/books")).rejects.toThrow("Unauthorized");
    expect(getToken()).toBeNull();
    expect(window.location.href).toBe("http://localhost:3000/login");
  });

  it("surfaces public endpoint errors without redirecting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid credentials" }), {
          status: 401,
        }),
      ),
    );

    await expect(
      publicApiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@example.com",
          password: "wrong",
        }),
      }),
    ).rejects.toThrow("Invalid credentials");
    expect(window.location.href).toBe("/");
  });
});
