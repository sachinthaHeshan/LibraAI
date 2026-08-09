import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../app.js";

describe("POST /auth/login", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  it("returns jwt for valid admin credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: process.env.ADMIN_EMAIL ?? "admin@libra.local",
        password: process.env.ADMIN_PASSWORD ?? "admin123",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf("string");
  });

  it("returns 401 for bad password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@libra.local", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 for an invalid login body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "not-an-email", password: "" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ message: "Invalid request" });
  });
});
