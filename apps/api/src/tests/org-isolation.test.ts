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

  it("does not leak members across orgs", async () => {
    const email = `member-a-${Date.now()}@libra.local`;
    const created = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        name: "Org A Member",
        email,
        membershipDate: "2026-08-10",
      },
    });
    expect(created.statusCode).toBe(201);

    const listB = await app.inject({
      method: "GET",
      url: "/members",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(listB.statusCode).toBe(200);
    const membersB = listB.json() as Array<{ email: string }>;
    expect(membersB.some((member) => member.email === email)).toBe(false);
  });

  it("returns 404 when returning another org's returned loan", async () => {
    const book = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        title: "Org B Loan Book",
        author: "Author",
        isbn: `ISBN-B-${Date.now()}`,
        totalCopies: 1,
      },
    });
    expect(book.statusCode).toBe(201);

    const member = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        name: "Org B Loan Member",
        email: `loan-member-b-${Date.now()}@libra.local`,
        membershipDate: "2026-08-10",
      },
    });
    expect(member.statusCode).toBe(201);

    const loan = await app.inject({
      method: "POST",
      url: "/loans",
      headers: { authorization: `Bearer ${tokenB}` },
      payload: {
        bookId: book.json().id,
        memberId: member.json().id,
        dueDate: "2026-08-24",
      },
    });
    expect(loan.statusCode).toBe(201);

    const returnedByOwner = await app.inject({
      method: "POST",
      url: `/loans/${loan.json().id}/return`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(returnedByOwner.statusCode).toBe(200);

    const returnedByOtherOrg = await app.inject({
      method: "POST",
      url: `/loans/${loan.json().id}/return`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(returnedByOtherOrg.statusCode).toBe(404);
  });
});
