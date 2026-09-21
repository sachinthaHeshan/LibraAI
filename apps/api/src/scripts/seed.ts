import { admins, createDb, organizations } from "@libra/db";
import bcrypt from "bcryptjs";
import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import { z } from "zod";
import { env } from "../env.js";
import { seedSampleCatalog } from "./seed-catalog.js";

const seedInputSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

const planSchema = z.enum(["starter", "pro", "enterprise"]);

async function ask(rl: readline.Interface, question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function askPassword(prompt: string): Promise<string> {
  stdout.write(prompt);

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve) => {
    let password = "";

    const onData = (char: string) => {
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(password);
        return;
      }

      if (char === "\u0003") {
        process.exit(0);
      }

      if (char === "\u007f" || char === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          stdout.write("\b \b");
        }
        return;
      }

      password += char;
      stdout.write("*");
    };

    stdin.on("data", onData);
  });
}

async function promptOrganization(db: ReturnType<typeof createDb>) {
  const orgs = await db.select().from(organizations).orderBy(organizations.name);

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    console.log("Select organization\n");
    console.log("0) Create new organization");
    orgs.forEach((org, index) => {
      console.log(`${index + 1}) ${org.name} (${org.plan})`);
    });

    while (true) {
      const choice = await ask(rl, "\nChoice: ");
      const num = Number.parseInt(choice, 10);

      if (choice === "0" || num === 0) {
        const name = await ask(rl, "Organization name: ");
        if (!name) {
          console.error("\nName is required. Try again.\n");
          continue;
        }

        let plan: z.infer<typeof planSchema>;
        while (true) {
          const planInput = await ask(rl, "Plan (starter/pro/enterprise) [pro]: ");
          const parsed = planSchema.safeParse(planInput || "pro");
          if (parsed.success) {
            plan = parsed.data;
            break;
          }
          console.error("\nInvalid plan. Choose starter, pro, or enterprise.\n");
        }

        const addressInput = await ask(rl, "Address (optional): ");
        const phoneInput = await ask(rl, "Phone (optional): ");

        const [org] = await db
          .insert(organizations)
          .values({
            name,
            plan,
            address: addressInput || null,
            phone: phoneInput || null,
          })
          .returning();

        return { organizationId: org.id, orgName: org.name };
      }

      if (!Number.isNaN(num) && num >= 1 && num <= orgs.length) {
        const org = orgs[num - 1]!;
        return { organizationId: org.id, orgName: org.name };
      }

      console.error(`\nInvalid choice. Enter 0–${orgs.length}.\n`);
    }
  } finally {
    rl.close();
  }
}

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
  console.error("Admin seed requires an interactive terminal. Run: just seed");
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

const inserted = await seedSampleCatalog(db, organizationId);
if (inserted > 0) {
  console.log(`Seeded ${inserted} sample catalog titles in ${orgName}`);
} else {
  console.log(`Sample catalog already present for ${orgName}`);
}

process.exit(0);
