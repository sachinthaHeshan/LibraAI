import { PgVector } from "@mastra/pg";
import { env } from "../env.js";

let pgVector: PgVector | undefined;

export function getPgVector(): PgVector {
  if (!pgVector) {
    pgVector = new PgVector({
      id: "pg-vector",
      connectionString: env.DATABASE_URL,
    });
  }
  return pgVector;
}
