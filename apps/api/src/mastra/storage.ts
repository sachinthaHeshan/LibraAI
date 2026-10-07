import { PostgresStore } from "@mastra/pg";
import { env } from "../env.js";

let store: PostgresStore | undefined;

/**
 * Mastra's own storage (traces, threads). Shared by the API and `mastra dev`
 * so Studio shows runs from the frontend chat. Kept in its own schema so it
 * doesn't mix with the app's Drizzle tables.
 */
export function getMastraStorage(): PostgresStore {
  if (!store) {
    store = new PostgresStore({
      id: "libra-mastra-store",
      connectionString: env.DATABASE_URL,
      schemaName: "mastra",
    });
  }
  return store;
}
