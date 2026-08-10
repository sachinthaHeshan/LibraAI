import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../create-app.js";
import { TEST_ADMIN } from "./test-admin.js";

function decodePayload(token: string) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) as {
    sub: string;
    orgId: string;
    email: string;
  };
}

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
        email: TEST_ADMIN.email,
        password: TEST_ADMIN.password,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { token: string };
    expect(body.token).toBeTypeOf("string");
    const claims = decodePayload(body.token);
    expect(claims.email).toBe(TEST_ADMIN.email);
    expect(typeof claims.orgId).toBe("string");
    expect(claims.orgId.length).toBeGreaterThan(0);
    expect(claims.sub).toBeTruthy();
    const payload = JSON.parse(
      Buffer.from(body.token.split(".")[1], "base64url").toString("utf8"),
    );
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
  });

  it("returns 401 for bad password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: "wrong" },
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
