import { admins, createDb } from "@libra/db";
import bcrypt from "bcryptjs";
import { env } from "../env.js";

const db = createDb(env.DATABASE_URL);
const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

await db
  .insert(admins)
  .values({
    email: env.ADMIN_EMAIL,
    passwordHash,
  })
  .onConflictDoUpdate({
    target: admins.email,
    set: { passwordHash },
  });

console.log(`Seeded admin ${env.ADMIN_EMAIL}`);
process.exit(0);
