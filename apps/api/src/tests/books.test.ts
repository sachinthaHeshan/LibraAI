import { randomUUID } from "node:crypto";
import { books, createDb, loans, members } from "@libra/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { env } from "../env.js";

describe("books API", () => {
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
    const response = await app.inject({ method: "GET", url: "/books" });

    expect(response.statusCode).toBe(401);
  });

  it("creates, reads, searches, updates, and deletes a book", async () => {
    const isbn = randomUUID();
    const create = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Dune",
        author: "Frank Herbert",
        isbn,
        totalCopies: 3,
        publishedYear: 1965,
      },
    });

    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      title: "Dune",
      author: "Frank Herbert",
      isbn,
      totalCopies: 3,
      availableCopies: 3,
      publishedYear: 1965,
    });
    const bookId = create.json().id;

    const get = await app.inject({
      method: "GET",
      url: `/books/${bookId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(get.statusCode).toBe(200);
    expect(get.json().id).toBe(bookId);

    const search = await app.inject({
      method: "GET",
      url: `/books?q=${isbn}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(search.statusCode).toBe(200);
    expect(search.json().map((book: { id: string }) => book.id)).toContain(bookId);

    const patch = await app.inject({
      method: "PATCH",
      url: `/books/${bookId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Dune Messiah", totalCopies: 5 },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({
      title: "Dune Messiah",
      totalCopies: 5,
      availableCopies: 5,
    });

    const remove = await app.inject({
      method: "DELETE",
      url: `/books/${bookId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(remove.statusCode).toBe(204);

    const missing = await app.inject({
      method: "GET",
      url: `/books/${bookId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(missing.statusCode).toBe(404);
  });

  it("rejects invalid create input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "", author: "", isbn: "", totalCopies: 0 },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 409 for a duplicate ISBN", async () => {
    const isbn = randomUUID();
    const payload = {
      title: "The Left Hand of Darkness",
      author: "Ursula K. Le Guin",
      isbn,
      totalCopies: 1,
    };
    const first = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(first.statusCode).toBe(201);

    const duplicate = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(duplicate.statusCode).toBe(409);

    await app.inject({
      method: "DELETE",
      url: `/books/${first.json().id}`,
      headers: { authorization: `Bearer ${token}` },
    });
  });

  it("returns 409 when deleting a book with an open loan", async () => {
    const db = createDb(env.DATABASE_URL);
    const create = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Kindred",
        author: "Octavia E. Butler",
        isbn: randomUUID(),
        totalCopies: 1,
      },
    });
    const bookId = create.json().id;
    const [member] = await db
      .insert(members)
      .values({
        name: "Books API Test",
        email: `${randomUUID()}@example.com`,
        membershipDate: "2026-08-09",
      })
      .returning();
    const [loan] = await db
      .insert(loans)
      .values({ bookId, memberId: member.id, dueDate: "2026-08-23" })
      .returning();

    const response = await app.inject({
      method: "DELETE",
      url: `/books/${bookId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ message: "Book has loan history" });

    await db.delete(loans).where(eq(loans.id, loan.id));
    await db.delete(books).where(eq(books.id, bookId));
    await db.delete(members).where(eq(members.id, member.id));
  });

  it("returns 409 when deleting a book with returned loan history", async () => {
    const db = createDb(env.DATABASE_URL);
    const create = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Parable of the Sower",
        author: "Octavia E. Butler",
        isbn: randomUUID(),
        totalCopies: 1,
      },
    });
    const bookId = create.json().id;
    const [member] = await db
      .insert(members)
      .values({
        name: "Returned Book Test",
        email: `${randomUUID()}@example.com`,
        membershipDate: "2026-08-09",
      })
      .returning();
    const [loan] = await db
      .insert(loans)
      .values({
        bookId,
        memberId: member.id,
        dueDate: "2026-08-23",
        returnedAt: new Date(),
        status: "returned",
      })
      .returning();

    const response = await app.inject({
      method: "DELETE",
      url: `/books/${bookId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ message: "Book has loan history" });

    await db.delete(loans).where(eq(loans.id, loan.id));
    await db.delete(books).where(eq(books.id, bookId));
    await db.delete(members).where(eq(members.id, member.id));
  });

  it("preserves borrowed copies when total copies changes concurrently", async () => {
    const db = createDb(env.DATABASE_URL);
    const create = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "The Fifth Season",
        author: "N. K. Jemisin",
        isbn: randomUUID(),
        totalCopies: 2,
      },
    });
    const bookId = create.json().id;
    const patchBook = () =>
      app.inject({
        method: "PATCH",
        url: `/books/${bookId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { totalCopies: 3 },
      });
    let patchPromise: ReturnType<typeof patchBook>;

    await db.transaction(async (tx) => {
      await tx
        .select({ id: books.id })
        .from(books)
        .where(eq(books.id, bookId))
        .for("update");

      patchPromise = patchBook();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await tx
        .update(books)
        .set({ availableCopies: 1 })
        .where(eq(books.id, bookId));
    });

    const patch = await patchPromise!;
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({
      totalCopies: 3,
      availableCopies: 2,
    });

    await db.delete(books).where(eq(books.id, bookId));
  });
});
