import { admins, createDb } from "@libra/db";
import bcrypt from "bcryptjs";
import { stdin } from "node:process";
import * as readline from "node:readline/promises";
import { z } from "zod";
import { env } from "../env.js";
import { ask, askPassword, promptOrganization } from "./seed-prompt.js";

const seedInputSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

async function promptSeedInput() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    console.log("\nCreate admin user\n");

    while (true) {
      const firstName = await ask(rl, "First name: ");
      const lastName = await ask(rl, "Last name: ");
      const email = await ask(rl, "Email: ");
      const password = await askPassword("Password: ");

      const parsed = seedInputSchema.safeParse({ firstName, lastName, email, password });
      if (parsed.success) {
        return parsed.data;
      }

      console.error(`\n${parsed.error.issues[0]?.message ?? "Invalid input"}. Try again.\n`);
    }
  } finally {
    rl.close();
  }
}

if (!stdin.isTTY) {
  console.error("Admin seed requires an interactive terminal. Run: just seed-admin");
  process.exit(1);
}

const db = createDb(env.DATABASE_URL);
const { organizationId, orgName } = await promptOrganization(db);
const { firstName, lastName, email, password } = await promptSeedInput();
const passwordHash = await bcrypt.hash(password, 12);

await db
  .insert(admins)
  .values({
    firstName,
    lastName,
    email,
    passwordHash,
    organizationId,
  })
  .onConflictDoUpdate({
    target: admins.email,
    set: { firstName, lastName, passwordHash, organizationId },
  });

console.log(`Seeded admin ${firstName} ${lastName} <${email}> in org ${orgName}`);

process.exit(0);
