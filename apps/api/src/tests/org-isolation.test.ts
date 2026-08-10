import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../create-app.js";
import { TEST_ADMIN } from "./test-admin.js";

describe("org isolation", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const loginA = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    tokenA = loginA.json().token;

    // Create second org via DB so this task does not depend on signup (Task 4).
    const { admins, organizations, createDb } = await import("@libra/db");
    const bcrypt = (await import("bcryptjs")).default;
    const { env } = await import("../env.js");
    const db = createDb(env.DATABASE_URL);
    const [orgB] = await db
      .insert(organizations)
      .values({ name: `Iso ${Date.now()}`, plan: "starter" })
      .returning();
    const emailB = `iso-${Date.now()}@libra.local`;
    await db.insert(admins).values({
      firstName: "Iso",
      lastName: "Admin",
      email: emailB,
      passwordHash: await bcrypt.hash("isopass123", 12),
      organizationId: orgB.id,
    });
    const loginB = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emailB, password: "isopass123" },
    });
    tokenB = loginB.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("does not leak books across orgs", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        title: "Org A Book",
        author: "Author",
        isbn: `ISBN-A-${Date.now()}`,
        totalCopies: 1,
      },
    });
    expect(created.statusCode).toBe(201);

    const listB = await app.inject({
      method: "GET",
      url: "/books",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(listB.statusCode).toBe(200);
    const booksB = listB.json() as Array<{ title: string }>;
    expect(booksB.some((b) => b.title === "Org A Book")).toBe(false);
  });
});
