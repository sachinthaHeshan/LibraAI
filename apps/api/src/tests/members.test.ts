import { randomUUID } from "node:crypto";
import { books, createDb, loans, members } from "@libra/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { env } from "../env.js";

describe("members API", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: process.env.ADMIN_EMAIL ?? "admin@libra.local",
        password: process.env.ADMIN_PASSWORD ?? "admin123",
      },
    });
    token = login.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/members" });

    expect(response.statusCode).toBe(401);
  });

  it("creates, reads, lists, updates, and deletes a member", async () => {
    const email = `${randomUUID()}@example.com`;
    const create = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Ada Lovelace",
        email,
        phone: "+44 20 7946 0958",
        membershipDate: "2026-01-01",
      },
    });

    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      name: "Ada Lovelace",
      email,
      phone: "+44 20 7946 0958",
      membershipDate: "2026-01-01",
      status: "active",
    });
    const memberId = create.json().id;

    const get = await app.inject({
      method: "GET",
      url: `/members/${memberId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().id).toBe(memberId);

    const list = await app.inject({
      method: "GET",
      url: "/members",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().map((member: { id: string }) => member.id)).toContain(
      memberId,
    );

    const patch = await app.inject({
      method: "PATCH",
      url: `/members/${memberId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Augusta Ada King", status: "inactive" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({
      name: "Augusta Ada King",
      status: "inactive",
    });

    const remove = await app.inject({
      method: "DELETE",
      url: `/members/${memberId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(remove.statusCode).toBe(204);

    const missing = await app.inject({
      method: "GET",
      url: `/members/${memberId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("rejects invalid create input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "",
        email: "not-an-email",
        membershipDate: "2026-01-01",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 409 for a duplicate email", async () => {
    const email = `${randomUUID()}@example.com`;
    const payload = {
      name: "Grace Hopper",
      email,
      membershipDate: "2026-08-09",
    };
    const first = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(first.statusCode).toBe(201);

    const duplicate = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(duplicate.statusCode).toBe(409);

    await app.inject({
      method: "DELETE",
      url: `/members/${first.json().id}`,
      headers: { authorization: `Bearer ${token}` },
    });
  });

  it("returns 409 when deleting a member with an open loan", async () => {
    const db = createDb(env.DATABASE_URL);
    const [member] = await db
      .insert(members)
      .values({
        name: "Member API Test",
        email: `${randomUUID()}@example.com`,
        membershipDate: "2026-08-09",
      })
      .returning();
    const [book] = await db
      .insert(books)
      .values({
        title: "The Dispossessed",
        author: "Ursula K. Le Guin",
        isbn: randomUUID(),
        totalCopies: 1,
        availableCopies: 0,
      })
      .returning();
    const [loan] = await db
      .insert(loans)
      .values({
        bookId: book.id,
        memberId: member.id,
        dueDate: "2026-08-23",
      })
      .returning();

    const response = await app.inject({
      method: "DELETE",
      url: `/members/${member.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ message: "Member has loan history" });

    await db.delete(loans).where(eq(loans.id, loan.id));
    await db.delete(books).where(eq(books.id, book.id));
    await db.delete(members).where(eq(members.id, member.id));
  });

  it("returns 409 when deleting a member with returned loan history", async () => {
    const db = createDb(env.DATABASE_URL);
    const [member] = await db
      .insert(members)
      .values({
        name: "Returned Member Test",
        email: `${randomUUID()}@example.com`,
        membershipDate: "2026-08-09",
      })
      .returning();
    const [book] = await db
      .insert(books)
      .values({
        title: "A Wizard of Earthsea",
        author: "Ursula K. Le Guin",
        isbn: randomUUID(),
        totalCopies: 1,
        availableCopies: 1,
      })
      .returning();
    const [loan] = await db
      .insert(loans)
      .values({
        bookId: book.id,
        memberId: member.id,
        dueDate: "2026-08-23",
        returnedAt: new Date(),
        status: "returned",
      })
      .returning();

    const response = await app.inject({
      method: "DELETE",
      url: `/members/${member.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ message: "Member has loan history" });

    await db.delete(loans).where(eq(loans.id, loan.id));
    await db.delete(books).where(eq(books.id, book.id));
    await db.delete(members).where(eq(members.id, member.id));
  });

  it("rejects an invalid membership calendar date", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Invalid Date Test",
        email: `${randomUUID()}@example.com`,
        membershipDate: "2026-02-30",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: "Invalid request" });
  });
});
