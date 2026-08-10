import { admins, createDb } from "@libra/db";
import bcrypt from "bcryptjs";
import { env } from "../env.js";

export const TEST_ADMIN = {
  firstName: "Test",
  lastName: "Admin",
  email: "admin@libra.local",
  password: "admin123",
} as const;

export async function ensureTestAdmin() {
  const db = createDb(env.DATABASE_URL);
  const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 12);

  await db
    .insert(admins)
    .values({
      firstName: TEST_ADMIN.firstName,
      lastName: TEST_ADMIN.lastName,
      email: TEST_ADMIN.email,
      passwordHash,
    })
    .onConflictDoUpdate({
      target: admins.email,
      set: {
        firstName: TEST_ADMIN.firstName,
        lastName: TEST_ADMIN.lastName,
        passwordHash,
      },
    });
}
