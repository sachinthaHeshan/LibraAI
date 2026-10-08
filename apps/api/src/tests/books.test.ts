import { randomUUID } from "node:crypto";
import { admins, books, createDb, loans, members } from "@libra/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../create-app.js";
import { env } from "../env.js";
import { TEST_ADMIN } from "./test-admin.js";

describe("books API", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  let orgId: string;

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

    const db = createDb(env.DATABASE_URL);
    const admin = await db.query.admins.findFirst({
      where: eq(admins.email, TEST_ADMIN.email),
    });
    if (!admin?.organizationId) {
      throw new Error("Test admin organization not found");
    }
    orgId = admin.organizationId;
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

    const titleSearch = await app.inject({
      method: "GET",
      url: "/books?q=Dune",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(titleSearch.statusCode).toBe(200);
    expect(titleSearch.json().map((book: { id: string }) => book.id)).toContain(
      bookId,
    );

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

  it("stores optional genre and description", async () => {
    const isbn = randomUUID();
    const create = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "The Hobbit",
        author: "J. R. R. Tolkien",
        isbn,
        totalCopies: 2,
        publishedYear: 1937,
        genre: "Fantasy",
        description: "A hobbit joins dwarves on a quest to reclaim a mountain.",
      },
    });

    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({
      title: "The Hobbit",
      genre: "Fantasy",
      description: "A hobbit joins dwarves on a quest to reclaim a mountain.",
    });

    const patch = await app.inject({
      method: "PATCH",
      url: `/books/${create.json().id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { genre: "Adventure", description: "Updated synopsis." },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({
      genre: "Adventure",
      description: "Updated synopsis.",
    });

    await app.inject({
      method: "DELETE",
      url: `/books/${create.json().id}`,
      headers: { authorization: `Bearer ${token}` },
    });
  });

  it("ranks title matches ahead of description-only full-text hits", async () => {
    const titleBook = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: randomUUID(),
        totalCopies: 1,
        genre: "Self-help",
        description: "A system for compounding identity change.",
      },
    });
    const descriptionBook = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Sleep Better",
        author: "Jane Doe",
        isbn: randomUUID(),
        totalCopies: 1,
        genre: "Self-help",
        description: "How daily habits affect rest and recovery.",
      },
    });
    expect(titleBook.statusCode).toBe(201);
    expect(descriptionBook.statusCode).toBe(201);

    const created = new Set([titleBook.json().id, descriptionBook.json().id]);
    const rankedIds = (q: string) =>
      app
        .inject({
          method: "GET",
          url: `/books?q=${encodeURIComponent(q)}`,
          headers: { authorization: `Bearer ${token}` },
        })
        .then((response) => {
          expect(response.statusCode).toBe(200);
          return response
            .json()
            .map((book: { id: string }) => book.id)
            .filter((id: string) => created.has(id));
        });

    expect(await rankedIds("Atomic Habits")).toEqual([titleBook.json().id]);
    expect(await rankedIds("habits")).toEqual([
      titleBook.json().id,
      descriptionBook.json().id,
    ]);

    await app.inject({
      method: "DELETE",
      url: `/books/${titleBook.json().id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    await app.inject({
      method: "DELETE",
      url: `/books/${descriptionBook.json().id}`,
      headers: { authorization: `Bearer ${token}` },
    });
  });

  it("searches case-insensitively by partial title, author, and ISBN", async () => {
    const isbn = `978-${randomUUID()}`;
    const create = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "The Zyzzyva Chronicles",
        author: "Quentin Marlowe",
        isbn,
        totalCopies: 1,
        genre: "Fantasy",
      },
    });
    expect(create.statusCode).toBe(201);
    const bookId = create.json().id;

    const idsFor = async (q: string) => {
      const response = await app.inject({
        method: "GET",
        url: `/books?q=${encodeURIComponent(q)}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(200);
      return response.json().map((book: { id: string }) => book.id);
    };

    expect(await idsFor("zyzz")).toContain(bookId);
    expect(await idsFor("ZYZZYVA chron")).toContain(bookId);
    expect(await idsFor("  zyzzyva   CHRONICLES ")).toContain(bookId);
    expect(await idsFor("marlo")).toContain(bookId);
    expect(await idsFor(isbn.slice(4, 14).toUpperCase())).toContain(bookId);
    expect(await idsFor("zyzz%chron")).not.toContain(bookId);
    expect(await idsFor("zyzz_va")).not.toContain(bookId);

    await app.inject({
      method: "DELETE",
      url: `/books/${bookId}`,
      headers: { authorization: `Bearer ${token}` },
    });
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
        organizationId: orgId,
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
        organizationId: orgId,
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
