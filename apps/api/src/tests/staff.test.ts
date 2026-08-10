import { admins, createDb, organizations } from "@libra/db";
import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../create-app.js";
import { env } from "../env.js";
import { decodePayload } from "./jwt-decode.js";
import { TEST_ADMIN } from "./test-admin.js";

describe("staff routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  let selfId: string;
  let otherOrgToken: string;
  let otherOrgId: string;
  let otherAdminId: string;
  let createdStaffId: string;
  let createdStaffEmail: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    token = login.json().token;
    selfId = decodePayload(token).sub;

    const db = createDb(env.DATABASE_URL);
    const suffix = `${Date.now()}-${Math.random()}`;
    const [otherOrg] = await db
      .insert(organizations)
      .values({ name: `Staff isolation ${suffix}`, plan: "starter" })
      .returning();
    otherOrgId = otherOrg.id;

    const otherEmail = `staff-isolation-${suffix}@libra.local`;
    const [otherAdmin] = await db
      .insert(admins)
      .values({
        firstName: "Other",
        lastName: "Admin",
        email: otherEmail,
        passwordHash: await bcrypt.hash("otherpass1", 12),
        organizationId: otherOrgId,
      })
      .returning();
    otherAdminId = otherAdmin.id;

    const otherLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: otherEmail, password: "otherpass1" },
    });
    otherOrgToken = otherLogin.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/staff" });
    expect(response.statusCode).toBe(401);
  });

  it("lists only public staff fields from the requester's organization", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/staff",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const rows = response.json() as Array<Record<string, unknown>>;
    expect(rows.some((row) => row.email === TEST_ADMIN.email)).toBe(true);
    expect(rows.every((row) => row.passwordHash === undefined)).toBe(true);
    expect(rows.some((row) => row.id === otherAdminId)).toBe(false);
  });

  it("creates staff with public fields and rejects duplicate emails", async () => {
    createdStaffEmail = `staff-${Date.now()}-${Math.random()}@libra.local`;
    const payload = {
      firstName: "Staff",
      lastName: "Member",
      email: createdStaffEmail,
      password: "staffpass1",
    };
    const created = await app.inject({
      method: "POST",
      url: "/staff",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      email: createdStaffEmail,
      firstName: "Staff",
      lastName: "Member",
    });
    expect(created.json().passwordHash).toBeUndefined();
    createdStaffId = created.json().id;

    const duplicate = await app.inject({
      method: "POST",
      url: "/staff",
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("updates staff, hashes a new password, and returns public fields", async () => {
    const updatedEmail = `updated-${Date.now()}-${Math.random()}@libra.local`;
    const response = await app.inject({
      method: "PATCH",
      url: `/staff/${createdStaffId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        firstName: "Updated",
        email: updatedEmail,
        password: "updatedpass1",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: createdStaffId,
      firstName: "Updated",
      email: updatedEmail,
    });
    expect(response.json().passwordHash).toBeUndefined();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: updatedEmail, password: "updatedpass1" },
    });
    expect(login.statusCode).toBe(200);
  });

  it("returns 404 when updating or deleting another organization's staff", async () => {
    const update = await app.inject({
      method: "PATCH",
      url: `/staff/${selfId}`,
      headers: { authorization: `Bearer ${otherOrgToken}` },
      payload: { firstName: "Leaked" },
    });
    expect(update.statusCode).toBe(404);

    const remove = await app.inject({
      method: "DELETE",
      url: `/staff/${selfId}`,
      headers: { authorization: `Bearer ${otherOrgToken}` },
    });
    expect(remove.statusCode).toBe(404);
  });

  it("rejects deleting yourself", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/staff/${selfId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: "Cannot delete yourself" });
  });

  it("rejects deleting the last admin", async () => {
    const tokenWithDifferentSubject = app.jwt.sign({
      sub: crypto.randomUUID(),
      orgId: otherOrgId,
      email: "former-admin@libra.local",
    });
    const response = await app.inject({
      method: "DELETE",
      url: `/staff/${otherAdminId}`,
      headers: { authorization: `Bearer ${tokenWithDifferentSubject}` },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Cannot delete the last admin",
    });
  });

  it("keeps at least one admin when two deletes race on a two-admin org", async () => {
    const db = createDb(env.DATABASE_URL);
    const suffix = `${Date.now()}-${Math.random()}`;
    const [raceOrg] = await db
      .insert(organizations)
      .values({ name: `Staff race ${suffix}`, plan: "starter" })
      .returning();

    const passwordHash = await bcrypt.hash("racepass1", 12);
    const [adminA] = await db
      .insert(admins)
      .values({
        firstName: "Race",
        lastName: "A",
        email: `race-a-${suffix}@libra.local`,
        passwordHash,
        organizationId: raceOrg.id,
      })
      .returning();
    const [adminB] = await db
      .insert(admins)
      .values({
        firstName: "Race",
        lastName: "B",
        email: `race-b-${suffix}@libra.local`,
        passwordHash,
        organizationId: raceOrg.id,
      })
      .returning();

    const raceToken = app.jwt.sign({
      sub: crypto.randomUUID(),
      orgId: raceOrg.id,
      email: "race-actor@libra.local",
    });
    const auth = { authorization: `Bearer ${raceToken}` };

    const [first, second] = await Promise.all([
      app.inject({ method: "DELETE", url: `/staff/${adminA.id}`, headers: auth }),
      app.inject({ method: "DELETE", url: `/staff/${adminB.id}`, headers: auth }),
    ]);

    const statuses = [first.statusCode, second.statusCode].sort(
      (a, b) => a - b,
    );
    expect(statuses).toEqual([204, 400]);
    const failed = first.statusCode === 400 ? first : second;
    expect(failed.json()).toEqual({ message: "Cannot delete the last admin" });

    const [{ value: remaining }] = await db
      .select({ value: count() })
      .from(admins)
      .where(eq(admins.organizationId, raceOrg.id));
    expect(remaining).toBe(1);
  });

  it("deletes staff and returns 404 when deleting it again", async () => {
    const deleted = await app.inject({
      method: "DELETE",
      url: `/staff/${createdStaffId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleted.statusCode).toBe(204);
    expect(deleted.body).toBe("");

    const missing = await app.inject({
      method: "DELETE",
      url: `/staff/${createdStaffId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(missing.statusCode).toBe(404);
  });
});
