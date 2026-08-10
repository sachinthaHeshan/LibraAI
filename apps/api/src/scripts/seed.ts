import { admins, createDb } from "@libra/db";
import bcrypt from "bcryptjs";
import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import { z } from "zod";
import { env } from "../env.js";

const seedInputSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

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

async function promptSeedInput() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    console.log("Create admin user\n");

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

const { firstName, lastName, email, password } = await promptSeedInput();
const db = createDb(env.DATABASE_URL);
const passwordHash = await bcrypt.hash(password, 12);

await db
  .insert(admins)
  .values({
    firstName,
    lastName,
    email,
    passwordHash,
  })
  .onConflictDoUpdate({
    target: admins.email,
    set: { firstName, lastName, passwordHash },
  });

console.log(`Seeded admin ${firstName} ${lastName} <${email}>`);
process.exit(0);
