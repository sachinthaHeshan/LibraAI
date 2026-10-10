import { admins, organizations, createDb } from "@libra/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { env } from "../env.js";

export const TEST_ADMIN = {
  firstName: "Test",
  lastName: "Admin",
  email: "admin@libra.local",
  password: "admin123",
} as const;

export const TEST_ORG = {
  name: "Test Library",
  plan: "pro" as const,
};

export async function ensureTestAdmin() {
  const db = createDb(env.DATABASE_URL);
  const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 12);

  let org = await db.query.organizations.findFirst({
    where: eq(organizations.name, TEST_ORG.name),
  });
  if (!org) {
    const [created] = await db
      .insert(organizations)
      .values({ name: TEST_ORG.name, plan: TEST_ORG.plan })
      .returning();
    org = created;
  }

  await db
    .insert(admins)
    .values({
      firstName: TEST_ADMIN.firstName,
      lastName: TEST_ADMIN.lastName,
      email: TEST_ADMIN.email,
      passwordHash,
      organizationId: org.id,
    })
    .onConflictDoUpdate({
      target: admins.email,
      set: {
        firstName: TEST_ADMIN.firstName,
        lastName: TEST_ADMIN.lastName,
        passwordHash,
        organizationId: org.id,
      },
    });
}
