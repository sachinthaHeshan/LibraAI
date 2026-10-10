import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../create-app.js";
import { decodePayload } from "./jwt-decode.js";
import { TEST_ADMIN } from "./test-admin.js";

describe("member preferences", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let memberToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    ownerToken = login.json().token;

    const signup = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        accountType: "member",
        organizationId: decodePayload(ownerToken).orgId,
        member: {
          firstName: "Pref",
          lastName: "Reader",
          email: `prefs-${Date.now()}@libra.local`,
          password: "prefspass1",
        },
      },
    });
    memberToken = signup.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  function prefs(method: "GET" | "PUT", token: string, payload?: unknown) {
    return app.inject({
      method,
      url: "/preferences",
      headers: { authorization: `Bearer ${token}` },
      payload: payload as object | undefined,
    });
  }

  it("returns the tag catalog and no selections for a new member", async () => {
    const res = await prefs("GET", memberToken);
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      categories: Array<{ id: string; tags: Array<{ id: string }> }>;
      selected: string[];
    };
    expect(body.categories.map((category) => category.id)).toEqual([
      "genres",
      "topics",
      "style",
      "moods",
      "settings",
    ]);
    const tagIds = body.categories.flatMap((category) => category.tags.map((tag) => tag.id));
    expect(new Set(tagIds).size).toBe(tagIds.length);
    expect(tagIds.length).toBeGreaterThanOrEqual(75);
    expect(body.categories[0]!.tags.length).toBeGreaterThan(0);
    expect(body.selected).toEqual([]);
  });

  it("saves multiple tags and replaces them on the next save", async () => {
    const first = await prefs("PUT", memberToken, {
      tags: ["fantasy", "history", "quick-reads", "cozy", "sri-lanka-south-asia", "fantasy"],
    });
    expect(first.statusCode).toBe(200);
    expect([...first.json().selected].sort()).toEqual([
      "cozy",
      "fantasy",
      "history",
      "quick-reads",
      "sri-lanka-south-asia",
    ]);

    const second = await prefs("PUT", memberToken, { tags: ["science"] });
    expect(second.json().selected).toEqual(["science"]);
    expect((await prefs("GET", memberToken)).json().selected).toEqual(["science"]);
  });

  it("rejects unknown tags without changing saved ones", async () => {
    const res = await prefs("PUT", memberToken, { tags: ["science", "not-a-tag"] });
    expect(res.statusCode).toBe(400);
    expect((await prefs("GET", memberToken)).json().selected).toEqual(["science"]);
  });

  it("is only for member accounts", async () => {
    expect((await prefs("GET", ownerToken)).statusCode).toBe(403);
    expect((await prefs("PUT", ownerToken, { tags: [] })).statusCode).toBe(403);
  });
});

describe("GET /recommendations", () => {
  it("is only for member accounts", async () => {
    const app = (await import("../create-app.js")).buildApp;
    const server = await app();
    await server.ready();
    const login = await server.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    const res = await server.inject({
      method: "GET",
      url: "/recommendations",
      headers: { authorization: `Bearer ${login.json().token}` },
    });
    expect(res.statusCode).toBe(403);
    await server.close();
  });
});
