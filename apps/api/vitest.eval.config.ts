import { defineConfig } from "vitest/config";

// Evaluation tests are pure: no database setup, no API keys.
export default defineConfig({
  test: {
    include: ["src/eval/**/*.test.ts"],
  },
});
