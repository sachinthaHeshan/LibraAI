import { createDb, organizations } from "@libra/db";
import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import { z } from "zod";

const planSchema = z.enum(["starter", "pro", "enterprise"]);

export async function ask(rl: readline.Interface, question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

export async function askPassword(prompt: string): Promise<string> {
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

export async function promptOrganization(db: ReturnType<typeof createDb>) {
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

export async function selectOrganization(
  db: ReturnType<typeof createDb>,
  { alwaysPrompt = false, command = "just seed-catalog" } = {},
) {
  const orgs = await db.select().from(organizations).orderBy(organizations.name);

  if (orgs.length === 0) {
    console.error("No organizations found. Run `just seed-admin` first.");
    process.exit(1);
  }

  if (orgs.length === 1 && !alwaysPrompt) {
    const org = orgs[0]!;
    console.log(`Using organization ${org.name}`);
    return { organizationId: org.id, orgName: org.name };
  }

  if (!stdin.isTTY) {
    console.error(`Catalog seed requires an interactive terminal to pick an organization. Run: ${command}`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    console.log("Select organization\n");
    orgs.forEach((org, index) => {
      console.log(`${index + 1}) ${org.name} (${org.plan})`);
    });

    while (true) {
      const choice = await ask(rl, "\nChoice: ");
      const num = Number.parseInt(choice, 10);

      if (!Number.isNaN(num) && num >= 1 && num <= orgs.length) {
        const org = orgs[num - 1]!;
        return { organizationId: org.id, orgName: org.name };
      }

      console.error(`\nInvalid choice. Enter 1–${orgs.length}.\n`);
    }
  } finally {
    rl.close();
  }
}
