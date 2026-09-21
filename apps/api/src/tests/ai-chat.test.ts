import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../create-app.js";
import { TEST_ADMIN } from "./test-admin.js";

vi.mock("../mastra/run-chat.js", () => ({
  generateSearchReply: vi.fn(async () => "The Hobbit is available (2 copies)."),
}));

describe("AI chat API", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      },
    });
    token = login.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires authentication", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/ai/chat",
      payload: { messages: [{ role: "user", content: "Find Tolkien" }] },
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects invalid bodies", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/ai/chat",
      headers: { authorization: `Bearer ${token}` },
      payload: { messages: [] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 503 when a Google API key is not configured", async () => {
    const previousGen = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const previousGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const response = await app.inject({
      method: "POST",
      url: "/ai/chat",
      headers: { authorization: `Bearer ${token}` },
      payload: { messages: [{ role: "user", content: "Find Tolkien" }] },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      message: "AI search is not configured",
    });

    if (previousGen !== undefined) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = previousGen;
    }
    if (previousGoogle !== undefined) {
      process.env.GOOGLE_API_KEY = previousGoogle;
    }
  });

  it("returns an agent reply when configured", async () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || "test-key";

    const response = await app.inject({
      method: "POST",
      url: "/ai/chat",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        messages: [{ role: "user", content: "Recommend something like Tolkien" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      reply: "The Hobbit is available (2 copies).",
    });
  });
});
