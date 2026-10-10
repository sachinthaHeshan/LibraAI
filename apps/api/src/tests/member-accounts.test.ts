import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../create-app.js";
import { decodePayload } from "./jwt-decode.js";
import { TEST_ADMIN, TEST_ORG } from "./test-admin.js";

describe("member accounts", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let orgId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    ownerToken = login.json().token;
    orgId = decodePayload(ownerToken).orgId;
  });

  afterAll(async () => {
    await app.close();
  });

  function signupMember(email: string, organizationId = orgId) {
    return app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        accountType: "member",
        organizationId,
        member: {
          firstName: "Kamala",
          lastName: "Silva",
          email,
          password: "memberpass1",
        },
      },
    });
  }

  it("lists libraries publicly for the signup form", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/libraries" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toContainEqual({ id: orgId, name: TEST_ORG.name });
  });

  it("signs up a member who can log in and see their profile", async () => {
    const email = `member-${Date.now()}@libra.local`;
    const signup = await signupMember(email);
    expect(signup.statusCode).toBe(201);
    const claims = decodePayload(signup.json().token);
    expect(claims).toMatchObject({ orgId, email, role: "member" });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "memberpass1" },
    });
    expect(login.statusCode).toBe(200);
    const token = login.json().token as string;

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      id: claims.sub,
      role: "member",
      firstName: "Kamala",
      lastName: "Silva",
      email,
      organization: { id: orgId },
    });
  });

  it("gives members read-only catalog access and no admin routes", async () => {
    const signup = await signupMember(`member-ro-${Date.now()}@libra.local`);
    const auth = { authorization: `Bearer ${signup.json().token}` };

    expect((await app.inject({ method: "GET", url: "/books", headers: auth })).statusCode).toBe(200);
    for (const [method, url] of [
      ["POST", "/books"],
      ["GET", "/members"],
      ["POST", "/loans"],
      ["POST", "/loans/00000000-0000-4000-8000-000000000000/return"],
      ["GET", "/staff"],
    ] as const) {
      const res = await app.inject({ method, url, headers: auth, payload: {} });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
    }
  });

  it("shows members only their own loans", async () => {
    const owner = { authorization: `Bearer ${ownerToken}` };
    const tag = Date.now();
    const book = await app.inject({
      method: "POST",
      url: "/books",
      headers: owner,
      payload: { title: `My Loans ${tag}`, author: "Tester", isbn: `ml-${tag}`, totalCopies: 3 },
    });
    expect(book.statusCode).toBe(201);
    const bookId = book.json().id as string;

    const mine = await signupMember(`mine-${tag}@libra.local`);
    const theirs = await signupMember(`theirs-${tag}@libra.local`);
    const mineId = decodePayload(mine.json().token).sub;
    const theirsId = decodePayload(theirs.json().token).sub;
    for (const memberId of [mineId, theirsId]) {
      const loan = await app.inject({
        method: "POST",
        url: "/loans",
        headers: owner,
        payload: { bookId, memberId, dueDate: "2099-01-01" },
      });
      expect(loan.statusCode).toBe(201);
    }

    const res = await app.inject({
      method: "GET",
      url: "/loans",
      headers: { authorization: `Bearer ${mine.json().token}` },
    });
    expect(res.statusCode).toBe(200);
    const memberIds = (res.json() as Array<{ memberId: string }>).map((loan) => loan.memberId);
    expect(memberIds).toEqual([mineId]);
  }, 20_000);

  it("lets a member borrow a book for themselves", async () => {
    const owner = { authorization: `Bearer ${ownerToken}` };
    const tag = Date.now();
    const book = await app.inject({
      method: "POST",
      url: "/books",
      headers: owner,
      payload: { title: `Self Borrow ${tag}`, author: "Tester", isbn: `sb-${tag}`, totalCopies: 1 },
    });
    const bookId = book.json().id as string;
    const signup = await signupMember(`borrower-${tag}@libra.local`);
    const member = { authorization: `Bearer ${signup.json().token}` };
    const memberId = decodePayload(signup.json().token).sub;

    const borrow = (headers: Record<string, string>, payload: object) =>
      app.inject({ method: "POST", url: "/loans/borrow", headers, payload });

    expect((await borrow(member, { bookId, duration: "3 days" })).statusCode).toBe(400);
    expect((await borrow(owner, { bookId, duration: "1 week" })).statusCode).toBe(403);

    const res = await borrow(member, { bookId, duration: "1 week" });
    expect(res.statusCode).toBe(201);
    const expectedDue = new Date();
    expectedDue.setUTCDate(expectedDue.getUTCDate() + 7);
    expect(res.json()).toMatchObject({
      bookId,
      memberId,
      status: "borrowed",
      dueDate: expectedDue.toISOString().slice(0, 10),
    });

    const again = await borrow(member, { bookId, duration: "2 weeks" });
    expect(again.statusCode).toBe(400);
    expect(again.json()).toEqual({ message: "No copies available" });
  }, 20_000);

  it("links the login to a member record staff already created", async () => {
    const email = `existing-${Date.now()}@libra.local`;
    const created = await app.inject({
      method: "POST",
      url: "/members",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: "Existing Member", email, membershipDate: "2026-01-01" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).not.toHaveProperty("passwordHash");

    const signup = await signupMember(email);
    expect(signup.statusCode).toBe(201);
    expect(decodePayload(signup.json().token).sub).toBe(created.json().id);

    const again = await signupMember(email);
    expect(again.statusCode).toBe(409);

    const list = await app.inject({
      method: "GET",
      url: "/members",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    for (const member of list.json() as Array<Record<string, unknown>>) {
      expect(member).not.toHaveProperty("passwordHash");
    }
  });

  it("rejects an owner's email and unknown libraries", async () => {
    expect((await signupMember(TEST_ADMIN.email)).statusCode).toBe(409);
    expect(
      (await signupMember(`nolib-${Date.now()}@libra.local`, "00000000-0000-4000-8000-000000000000"))
        .statusCode,
    ).toBe(404);
  });

  it("marks owner tokens with the owner role", async () => {
    expect(decodePayload(ownerToken).role).toBe("owner");
  });
});
