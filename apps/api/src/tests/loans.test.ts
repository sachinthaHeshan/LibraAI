import { randomUUID } from "node:crypto";
import { books, createDb, loans, members } from "@libra/db";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { env } from "../env.js";

describe("loans API", () => {
  const db = createDb(env.DATABASE_URL);
  const bookIds: string[] = [];
  const memberIds: string[] = [];
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

  afterEach(async () => {
    if (bookIds.length > 0) {
      await db.delete(loans).where(inArray(loans.bookId, bookIds));
      await db.delete(books).where(inArray(books.id, bookIds));
      bookIds.length = 0;
    }
    if (memberIds.length > 0) {
      await db.delete(members).where(inArray(members.id, memberIds));
      memberIds.length = 0;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function createBook(totalCopies = 1) {
    const response = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: "Parable of the Sower",
        author: "Octavia E. Butler",
        isbn: randomUUID(),
        totalCopies,
      },
    });
    const book = response.json();
    bookIds.push(book.id);
    return book;
  }

  async function createMember(status: "active" | "inactive" = "active") {
    const response = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Loan Test Member",
        email: `${randomUUID()}@example.com`,
        membershipDate: "2026-08-09",
        status,
      },
    });
    const member = response.json();
    memberIds.push(member.id);
    return member;
  }

  async function issueLoan(bookId: string, memberId: string, dueDate = "2026-08-23") {
    return app.inject({
      method: "POST",
      url: "/loans",
      headers: { authorization: `Bearer ${token}` },
      payload: { bookId, memberId, dueDate },
    });
  }

  it("issues a book and decrements availableCopies", async () => {
    const book = await createBook();
    const member = await createMember();

    const response = await issueLoan(book.id, member.id);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      bookId: book.id,
      memberId: member.id,
      dueDate: "2026-08-23",
      status: "borrowed",
    });
    const storedBook = await db.query.books.findFirst({
      where: (row, { eq }) => eq(row.id, book.id),
    });
    expect(storedBook?.availableCopies).toBe(0);
  });

  it("rejects issue when no copies are available", async () => {
    const book = await createBook();
    const firstMember = await createMember();
    const secondMember = await createMember();
    expect((await issueLoan(book.id, firstMember.id)).statusCode).toBe(201);

    const response = await issueLoan(book.id, secondMember.id);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: "No copies available" });
  });

  it("rejects issue for an inactive member", async () => {
    const book = await createBook();
    const member = await createMember("inactive");

    const response = await issueLoan(book.id, member.id);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: "Member is inactive" });
  });

  it("requires a librarian-chosen due date", async () => {
    const book = await createBook();
    const member = await createMember();

    const response = await app.inject({
      method: "POST",
      url: "/loans",
      headers: { authorization: `Bearer ${token}` },
      payload: { bookId: book.id, memberId: member.id },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns a book and increments availableCopies", async () => {
    const book = await createBook();
    const member = await createMember();
    const issue = await issueLoan(book.id, member.id);

    const response = await app.inject({
      method: "POST",
      url: `/loans/${issue.json().id}/return`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "returned" });
    expect(response.json().returnedAt).toEqual(expect.any(String));
    const storedBook = await db.query.books.findFirst({
      where: (row, { eq }) => eq(row.id, book.id),
    });
    expect(storedBook?.availableCopies).toBe(1);
  });

  it("lists borrowed loans with joined book/member data and overdue flag", async () => {
    const book = await createBook();
    const member = await createMember();
    const issue = await issueLoan(book.id, member.id, "2020-01-01");

    const response = await app.inject({
      method: "GET",
      url: "/loans?status=borrowed",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const loan = response
      .json()
      .find((candidate: { id: string }) => candidate.id === issue.json().id);
    expect(loan).toMatchObject({
      id: issue.json().id,
      dueDate: "2020-01-01",
      status: "borrowed",
      book: { id: book.id, title: "Parable of the Sower" },
      member: { id: member.id, name: "Loan Test Member" },
      overdue: true,
    });
  });
});
