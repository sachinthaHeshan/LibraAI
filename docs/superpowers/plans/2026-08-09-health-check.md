# Health Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `GET /health` liveness endpoint that returns `{ "status": "ok" }`.

**Architecture:** Dedicated Fastify route plugin registered in `buildApp`, matching existing route modules. No DB access.

**Tech Stack:** Fastify, Vitest (`app.inject`)

## Global Constraints

- Liveness only — no database check
- Public route — no JWT
- Response shape exactly `{ "status": "ok" }` with HTTP 200

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/api/src/tests/health.test.ts` | Inject test for `GET /health` |
| `apps/api/src/routes/health.ts` | Route plugin |
| `apps/api/src/app.ts` | Register health routes |

---

### Task 1: Failing health test

**Files:**
- Create: `apps/api/src/tests/health.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../app.js";

describe("GET /health", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  it("returns 200 with status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});
```

- [x] **Step 2: Run test and confirm it fails**

Run: `pnpm --filter api test -- src/tests/health.test.ts`  
Expected: fail (route missing / 404)

---

### Task 2: Implement and register route

**Files:**
- Create: `apps/api/src/routes/health.ts`
- Modify: `apps/api/src/app.ts`

- [x] **Step 1: Add route module**

```ts
import type { FastifyPluginAsync } from "fastify";

export function createHealthRoutes(): FastifyPluginAsync {
  return async (app) => {
    app.get("/health", async () => ({ status: "ok" }));
  };
}
```

- [x] **Step 2: Register in `buildApp`**

Import `createHealthRoutes` and `await app.register(createHealthRoutes());` before other routes.

- [x] **Step 3: Run test and confirm it passes**

Run: `pnpm --filter api test -- src/tests/health.test.ts`  
Expected: pass
