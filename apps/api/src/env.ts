import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
  resolve(import.meta.dirname, "../../../.env"),
];

for (const path of envCandidates) {
  if (existsSync(path)) {
    dotenv.config({ path });
    break;
  }
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
