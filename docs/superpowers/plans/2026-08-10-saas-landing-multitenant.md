# SaaS Landing, Multi-Tenant Orgs & Self Sign-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship org-scoped multi-tenancy, self sign-up with plan + library details, seed org selection, staff management, and a Daylight Ops public landing page at `/`.

**Architecture:** Add `organizations` with `plan`; attach `organizationId` to admins, books, and members; put `orgId` on JWTs; scope every library/staff query by JWT org. Public `/` landing + `/signup`; authenticated `/staff`. No payments; plan limits are marketing copy only.

**Tech Stack:** Fastify + `@fastify/jwt`, Drizzle/Postgres, Next.js App Router, Tailwind v4 tokens, Vitest (`pnpm test:api`, `pnpm --filter @libra/web test`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-saas-landing-multitenant-design.md`
- JWT payload must be `{ sub, orgId, email }` (8h expiry unchanged)
- Never trust client-supplied `organizationId` for scoping — always `request.user.orgId`
- Plan enum: `starter` | `pro` | `enterprise` — prices LKR 3,000 / 6,000 / 9,000 display only
- Flat staff permissions; cannot delete self or last admin in org
- Chat widget stays on `AppShell` pages only (not landing/login/signup)
- Landing visual: Daylight Ops + Focused five; reuse `--accent` `#2f6bff` family
- Delivery order: schema/JWT → scope routes → signup → seed → staff → landing

---

## File Structure

```
packages/db/src/schema.ts              # organizations, FKs, composite uniques
packages/db/drizzle/0002_*.sql         # generated + backfill migration

apps/api/src/
├── types/fastify-jwt.d.ts             # JWT payload typing
├── lib/org.ts                         # requireOrgId(request)
├── plugins/auth.ts                    # unchanged authenticate
├── routes/auth.ts                     # login orgId + signup
├── routes/books.ts | members.ts | loans.ts  # org filters
├── routes/staff.ts                    # staff CRUD
├── create-app.ts                      # register staff routes
├── scripts/seed.ts                    # org select/create
└── tests/
    ├── test-admin.ts                  # ensure test org + admin
    ├── auth.test.ts                   # login orgId + signup
    ├── books.test.ts | members.test.ts | loans.test.ts
    ├── org-isolation.test.ts          # cross-org isolation
    └── staff.test.ts

apps/web/
├── app/page.tsx                       # landing (no redirect)
├── app/signup/page.tsx
├── app/staff/page.tsx
├── components/AppShell.tsx            # Staff nav link
├── components/landing/*               # section components
├── components/StaffForm.tsx
├── lib/plans.ts                       # pricing copy + types
└── lib/plans.test.ts
```

---

### Task 1: Organizations schema + migration + test admin org

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: migration under `packages/db/drizzle/` (via `pnpm db:generate`, then edit SQL for backfill)
- Modify: `apps/api/src/tests/test-admin.ts`
- Modify: `apps/api/src/tests/setup.ts` (only if imports change)

**Interfaces:**
- Consumes: existing `admins`, `books`, `members` tables
- Produces:
  - `export const organizationPlanEnum = pgEnum("organization_plan", ["starter", "pro", "enterprise"])`
  - `export const organizations = pgTable("organizations", { id, name, address, phone, plan, createdAt })`
  - `admins.organizationId`, `books.organizationId`, `members.organizationId` (required FKs)
  - Composite uniques: `(organizationId, isbn)` on books; `(organizationId, email)` on members
  - Drop global `books.isbn` unique and `members.email` unique
  - `ensureTestAdmin()` also ensures a test organization and sets `organizationId`

- [ ] **Step 1: Update schema**

In `packages/db/src/schema.ts`, add imports `uniqueIndex` (or `unique`) from `drizzle-orm/pg-core`. Add:

```ts
export const organizationPlanEnum = pgEnum("organization_plan", [
  "starter",
  "pro",
  "enterprise",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  plan: organizationPlanEnum("plan").notNull().default("pro"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Add `organizationId` to `admins`, `books`, `members`:

```ts
organizationId: uuid("organization_id")
  .notNull()
  .references(() => organizations.id),
```

Replace global unique on `books.isbn` / `members.email` with table-level composites, e.g.:

```ts
export const books = pgTable(
  "books",
  { /* columns including organizationId, isbn without .unique() */ },
  (t) => [uniqueIndex("books_organization_id_isbn_uidx").on(t.organizationId, t.isbn)],
);

export const members = pgTable(
  "members",
  { /* columns including organizationId, email without .unique() */ },
  (t) => [uniqueIndex("members_organization_id_email_uidx").on(t.organizationId, t.email)],
);
```

Keep `admins.email` globally unique.

- [ ] **Step 2: Generate migration and add backfill**

```bash
pnpm db:generate
pnpm db:build
```

Edit the new SQL so that before `NOT NULL` on FKs it:

1. Inserts default org: `INSERT INTO organizations (id, name, plan) VALUES ('00000000-0000-4000-8000-000000000001', 'Default Library', 'pro');` (or `gen_random_uuid()` stored in a DO block)
2. Updates all existing `admins` / `books` / `members` to that org id
3. Drops old unique constraints on `books_isbn` / `members_email`
4. Adds composite unique indexes
5. Sets `organization_id` NOT NULL + FKs

Apply:

```bash
pnpm db:migrate
```

Expected: migrate succeeds against local Postgres.

- [ ] **Step 3: Update `ensureTestAdmin`**

```ts
import { admins, organizations, createDb } from "@libra/db";
import { eq } from "drizzle-orm";

export const TEST_ORG = {
  name: "Test Library",
  plan: "pro" as const,
};

export async function ensureTestAdmin() {
  const db = createDb(env.DATABASE_URL);
  const passwordHash = await bcrypt.hash(TEST_ADMIN.password, 12);

  let org = await db.query.organizations.findFirst({
    where: eq(organizations.name, TEST_ORG.name),
  });
  if (!org) {
    const [created] = await db
      .insert(organizations)
      .values({ name: TEST_ORG.name, plan: TEST_ORG.plan })
      .returning();
    org = created;
  }

  await db
    .insert(admins)
    .values({
      firstName: TEST_ADMIN.firstName,
      lastName: TEST_ADMIN.lastName,
      email: TEST_ADMIN.email,
      passwordHash,
      organizationId: org.id,
    })
    .onConflictDoUpdate({
      target: admins.email,
      set: {
        firstName: TEST_ADMIN.firstName,
        lastName: TEST_ADMIN.lastName,
        passwordHash,
        organizationId: org.id,
      },
    });
}
```

- [ ] **Step 4: Run API tests (expect many failures until later tasks scope routes / JWT)**

```bash
pnpm test:api
```

Expected: suite may fail on insert/login until Tasks 2–5; schema + ensureTestAdmin must not throw in setup. If setup itself fails, fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add packages/db apps/api/src/tests/test-admin.ts
git commit -m "feat(db): add organizations and org-scoped FKs"
```

---

### Task 2: JWT `orgId` + `requireOrgId` + login

**Files:**
- Create: `apps/api/src/types/fastify-jwt.d.ts`
- Create: `apps/api/src/lib/org.ts`
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/tests/auth.test.ts`

**Interfaces:**
- Consumes: `admins.organizationId` from Task 1
- Produces:
  - JWT payload `{ sub: string; orgId: string; email: string }`
  - `export function requireOrgId(request: FastifyRequest): string`
  - Login signs `{ sub: admin.id, orgId: admin.organizationId, email }`

- [ ] **Step 1: Write failing auth test for orgId claim**

In `apps/api/src/tests/auth.test.ts`, extend the successful login test:

```ts
import { decodeJwt } from "jose"; // only if already a dependency — otherwise decode with Buffer:

function decodePayload(token: string) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) as {
    sub: string;
    orgId: string;
    email: string;
  };
}

// inside successful login test:
const body = res.json() as { token: string };
const claims = decodePayload(body.token);
expect(claims.email).toBe(TEST_ADMIN.email);
expect(typeof claims.orgId).toBe("string");
expect(claims.orgId.length).toBeGreaterThan(0);
expect(claims.sub).toBeTruthy();
```

Do **not** add `jose` unless already present — use the Buffer decoder above.

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @libra/api exec vitest run src/tests/auth.test.ts
```

Expected: FAIL because `orgId` missing from token.

- [ ] **Step 3: Implement JWT typing, helper, login sign**

`apps/api/src/types/fastify-jwt.d.ts`:

```ts
import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; orgId: string; email: string };
    user: { sub: string; orgId: string; email: string };
  }
}
```

`apps/api/src/lib/org.ts`:

```ts
import type { FastifyRequest } from "fastify";
import { AppError } from "./errors.js";

export function requireOrgId(request: FastifyRequest): string {
  const orgId = request.user?.orgId;
  if (!orgId) {
    throw new AppError(401, "Unauthorized");
  }
  return orgId;
}
```

Update login in `auth.ts`:

```ts
return {
  token: app.jwt.sign({
    sub: admin.id,
    orgId: admin.organizationId,
    email,
  }),
};
```

Ensure `tsconfig` includes the `types` folder (it should via `src/**/*`).

- [ ] **Step 4: Run auth tests**

```bash
pnpm --filter @libra/api exec vitest run src/tests/auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/types/fastify-jwt.d.ts apps/api/src/lib/org.ts apps/api/src/routes/auth.ts apps/api/src/tests/auth.test.ts
git commit -m "feat(api): include orgId in JWT on login"
```

---

### Task 3: Org-scope books + members + loans

**Files:**
- Modify: `apps/api/src/routes/books.ts`
- Modify: `apps/api/src/routes/members.ts`
- Modify: `apps/api/src/routes/loans.ts`
- Create: `apps/api/src/tests/org-isolation.test.ts`
- Modify existing books/members/loans tests only if inserts fail without `organizationId` (prefer scoping in route layer so tests keep working via JWT org)

**Interfaces:**
- Consumes: `requireOrgId`, JWT from Task 2
- Produces: all books/members/loans operations scoped to JWT org; loan issue requires book + member same org as JWT

- [ ] **Step 1: Write failing isolation test**

Create `apps/api/src/tests/org-isolation.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../create-app.js";
import { TEST_ADMIN } from "./test-admin.js";

describe("org isolation", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const loginA = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    tokenA = loginA.json().token;

    // Create second org via DB so this task does not depend on signup (Task 4).
    const { admins, organizations, createDb } = await import("@libra/db");
    const bcrypt = (await import("bcryptjs")).default;
    const { env } = await import("../env.js");
    const db = createDb(env.DATABASE_URL);
    const [orgB] = await db
      .insert(organizations)
      .values({ name: `Iso ${Date.now()}`, plan: "starter" })
      .returning();
    const emailB = `iso-${Date.now()}@libra.local`;
    await db.insert(admins).values({
      firstName: "Iso",
      lastName: "Admin",
      email: emailB,
      passwordHash: await bcrypt.hash("isopass123", 12),
      organizationId: orgB.id,
    });
    const loginB = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: emailB, password: "isopass123" },
    });
    tokenB = loginB.json().token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("does not leak books across orgs", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/books",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        title: "Org A Book",
        author: "Author",
        isbn: `ISBN-A-${Date.now()}`,
        totalCopies: 1,
      },
    });
    expect(created.statusCode).toBe(201);

    const listB = await app.inject({
      method: "GET",
      url: "/books",
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(listB.statusCode).toBe(200);
    const booksB = listB.json() as Array<{ title: string }>;
    expect(booksB.some((b) => b.title === "Org A Book")).toBe(false);
  });
});
```

- [ ] **Step 2: Run isolation test — expect fail (books still global)**

```bash
pnpm --filter @libra/api exec vitest run src/tests/org-isolation.test.ts
```

Expected: FAIL (book visible to org B or create fails).

- [ ] **Step 3: Scope books routes**

At top of each handler after authenticate, `const orgId = requireOrgId(request);`.

- List: `and(eq(books.organizationId, orgId), searchClause?)`
- Get by id: `and(eq(books.id, id), eq(books.organizationId, orgId))` → 404 if missing
- Create: insert `{ ...input, organizationId: orgId, availableCopies: input.totalCopies }`
- Update/Delete: where `and(eq(books.id, id), eq(books.organizationId, orgId))`

Import `and` from `drizzle-orm` and `requireOrgId` from `../lib/org.js`.

- [ ] **Step 4: Scope members routes**

Same pattern with `members.organizationId`.

- [ ] **Step 5: Scope loans routes**

- List: join or filter loans whose `book.organizationId === orgId` (and/or member). Example:

```ts
const orgId = requireOrgId(request);
const rows = await db.query.loans.findMany({
  where: status ? eq(loans.status, status) : undefined,
  with: { /* only if relations defined */ },
});
```

If no drizzle relations exist, list via:

```ts
const orgBooks = await db.select({ id: books.id }).from(books).where(eq(books.organizationId, orgId));
const bookIds = orgBooks.map((b) => b.id);
// filter loans where bookId in bookIds (and status)
```

Or use `inArray(loans.bookId, bookIds)`.

- Create loan: load member and book with `and(eq(id), eq(organizationId, orgId))`; if either missing → 404; then existing copy/active checks.

- Return: load loan; load its book; if `book.organizationId !== orgId` → 404.

- [ ] **Step 6: Run books, members, loans, isolation tests**

```bash
pnpm test:api
```

Expected: PASS for scoped routes + isolation.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/books.ts apps/api/src/routes/members.ts apps/api/src/routes/loans.ts apps/api/src/tests/org-isolation.test.ts
git commit -m "feat(api): scope books, members, and loans by organization"
```

---

### Task 4: Self sign-up API

**Files:**
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/tests/auth.test.ts`

**Interfaces:**
- Consumes: `organizations`, `admins` schema
- Produces: `POST /auth/signup` → `{ token }` with JWT `{ sub, orgId, email }`

- [ ] **Step 1: Write failing signup tests**

Append to `auth.test.ts`:

```ts
describe("POST /auth/signup", () => {
  it("creates org + admin and returns jwt with orgId", async () => {
    const email = `signup-${Date.now()}@libra.local`;
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        plan: "starter",
        organization: {
          name: "Colombo City Library",
          address: "1 Main St",
          phone: "+94112345678",
        },
        admin: {
          firstName: "Nimal",
          lastName: "Perera",
          email,
          password: "securepass1",
        },
      },
    });
    expect(res.statusCode).toBe(201);
    const { token } = res.json() as { token: string };
    const claims = decodePayload(token);
    expect(claims.email).toBe(email);
    expect(claims.orgId).toBeTruthy();

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "securepass1" },
    });
    expect(login.statusCode).toBe(200);
  });

  it("rejects duplicate email with 409", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        plan: "pro",
        organization: { name: "Dup Org", address: null, phone: null },
        admin: {
          firstName: "Test",
          lastName: "Admin",
          email: TEST_ADMIN.email,
          password: "whatever123",
        },
      },
    });
    expect(res.statusCode).toBe(409);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
pnpm --filter @libra/api exec vitest run src/tests/auth.test.ts
```

Expected: FAIL (404 / missing route).

- [ ] **Step 3: Implement signup**

```ts
const signupBodySchema = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
  organization: z.object({
    name: z.string().min(1),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  admin: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

app.post("/auth/signup", async (request, reply) => {
  const body = signupBodySchema.parse(request.body);

  try {
    const result = await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: body.organization.name,
          address: body.organization.address ?? null,
          phone: body.organization.phone ?? null,
          plan: body.plan,
        })
        .returning();

      const passwordHash = await bcrypt.hash(body.admin.password, 12);
      const [admin] = await tx
        .insert(admins)
        .values({
          firstName: body.admin.firstName,
          lastName: body.admin.lastName,
          email: body.admin.email,
          passwordHash,
          organizationId: org.id,
        })
        .returning();

      return { org, admin };
    });

    return reply.status(201).send({
      token: app.jwt.sign({
        sub: result.admin.id,
        orgId: result.org.id,
        email: result.admin.email,
      }),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "Email already registered");
    }
    throw error;
  }
});
```

Share `isUniqueViolation` helper (copy from books or extract to `lib/pg.ts`).

- [ ] **Step 4: Run auth + full API tests**

```bash
pnpm test:api
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/auth.ts apps/api/src/tests/auth.test.ts apps/api/src/lib/pg.ts
git commit -m "feat(api): add public self sign-up with organization and plan"
```

---

### Task 5: Seed script — select or create organization

**Files:**
- Modify: `apps/api/src/scripts/seed.ts`

**Interfaces:**
- Consumes: `organizations`, `admins`
- Produces: interactive seed that attaches admin to chosen/created org (no automated test)

- [ ] **Step 1: Extend seed prompts**

Before admin credentials:

1. `const orgs = await db.select().from(organizations).orderBy(organizations.name)`
2. Print numbered list + option `0) Create new organization`
3. If create: prompt name, plan (`starter`/`pro`/`enterprise`), optional address/phone → insert
4. Else: select by number → `organizationId`
5. Existing admin prompts; on insert/update set `organizationId`

```ts
await db
  .insert(admins)
  .values({ firstName, lastName, email, passwordHash, organizationId })
  .onConflictDoUpdate({
    target: admins.email,
    set: { firstName, lastName, passwordHash, organizationId },
  });

console.log(`Seeded admin ${firstName} ${lastName} <${email}> in org ${orgName}`);
```

- [ ] **Step 2: Manual verify**

```bash
just seed
```

Expected: can create org or pick existing; admin logs in afterward.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/scripts/seed.ts
git commit -m "feat(api): seed admin into selected or new organization"
```

---

### Task 6: Staff API

**Files:**
- Create: `apps/api/src/routes/staff.ts`
- Modify: `apps/api/src/create-app.ts`
- Create: `apps/api/src/tests/staff.test.ts`

**Interfaces:**
- Consumes: `requireOrgId`, `admins`
- Produces:
  - `GET /staff` → admin list (no passwordHash)
  - `POST /staff` → 201 admin
  - `PATCH /staff/:id` → updated admin
  - `DELETE /staff/:id` → 204
  - `createStaffRoutes(db): FastifyPluginAsync`

- [ ] **Step 1: Write failing staff tests**

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../create-app.js";
import { TEST_ADMIN } from "./test-admin.js";

describe("staff routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  let selfId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
    });
    token = login.json().token;
    selfId = decodePayload(token).sub;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists staff in org", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/staff",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as Array<{ email: string; passwordHash?: string }>;
    expect(rows.some((r) => r.email === TEST_ADMIN.email)).toBe(true);
    expect(rows[0]?.passwordHash).toBeUndefined();
  });

  it("creates staff", async () => {
    const email = `staff-${Date.now()}@libra.local`;
    const res = await app.inject({
      method: "POST",
      url: "/staff",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        firstName: "Staff",
        lastName: "Member",
        email,
        password: "staffpass1",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email, firstName: "Staff" });
  });

  it("rejects deleting self", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/staff/${selfId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

Copy `decodePayload` into the test file (or a tiny `tests/jwt-decode.ts` helper).

- [ ] **Step 2: Run — expect fail**

```bash
pnpm --filter @libra/api exec vitest run src/tests/staff.test.ts
```

Expected: FAIL (404).

- [ ] **Step 3: Implement `createStaffRoutes`**

Public fields helper:

```ts
function toPublicAdmin(row: typeof admins.$inferSelect) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    createdAt: row.createdAt,
  };
}
```

- GET: `findMany({ where: eq(admins.organizationId, orgId) })` → map `toPublicAdmin`
- POST: zod `{ firstName, lastName, email, password: min 8 }` → insert with `organizationId` → 201 public; unique → 409
- PATCH: partial name/email/password; scope by id+orgId; hash password if present
- DELETE:
  - if `id === request.user.sub` → 400 `"Cannot delete yourself"`
  - count admins in org; if `count <= 1` → 400 `"Cannot delete the last admin"`
  - delete where id+orgId; if none → 404
  - return 204

Register in `create-app.ts`: `await app.register(createStaffRoutes(db));`

- [ ] **Step 4: Run staff + full API tests**

```bash
pnpm test:api
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/staff.ts apps/api/src/create-app.ts apps/api/src/tests/staff.test.ts apps/api/src/tests/jwt-decode.ts
git commit -m "feat(api): add org-scoped staff management routes"
```

---

### Task 7: Plans helper + signup page

**Files:**
- Create: `apps/web/lib/plans.ts`
- Create: `apps/web/lib/plans.test.ts`
- Create: `apps/web/app/signup/page.tsx`
- Modify: `apps/web/app/login/page.tsx` (add link to signup)

**Interfaces:**
- Consumes: `publicApiFetch`, `setToken`
- Produces:
  - `export type PlanId = "starter" | "pro" | "enterprise"`
  - `export type Plan = { id: PlanId; name: string; priceLkr: number; features: string[]; highlighted?: boolean }`
  - `export const PLANS: Plan[]`
  - `export function parsePlanId(value: string | null | undefined): PlanId` — default `"pro"`
  - Signup page posts to `/auth/signup`, stores token, navigates `/overview`

- [ ] **Step 1: Failing unit tests for plans**

```ts
import { describe, expect, it } from "vitest";
import { PLANS, parsePlanId } from "./plans";

describe("plans", () => {
  it("includes three LKR prices", () => {
    expect(PLANS.map((p) => p.priceLkr)).toEqual([3000, 6000, 9000]);
  });

  it("defaults invalid plan to pro", () => {
    expect(parsePlanId(null)).toBe("pro");
    expect(parsePlanId("nope")).toBe("pro");
    expect(parsePlanId("starter")).toBe("starter");
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
pnpm --filter @libra/web test
```

Expected: FAIL (module missing).

- [ ] **Step 3: Implement `lib/plans.ts`**

```ts
export type PlanId = "starter" | "pro" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  priceLkr: number;
  features: string[];
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceLkr: 3000,
    features: [
      "1 library organization",
      "Up to 2 staff",
      "Books, members, and loans",
      "AI assistant",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceLkr: 6000,
    highlighted: true,
    features: [
      "Up to 10 staff",
      "Larger catalogue capacity",
      "Priority AI usage",
      "Books, members, and loans",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceLkr: 9000,
    features: [
      "Unlimited staff",
      "Dedicated support",
      "Full AI access",
      "Books, members, and loans",
    ],
  },
];

export function parsePlanId(value: string | null | undefined): PlanId {
  if (value === "starter" || value === "pro" || value === "enterprise") return value;
  return "pro";
}

export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString("en-LK")}`;
}
```

- [ ] **Step 4: Build `/signup` page**

Client page mirroring login aesthetics:

- Read `useSearchParams().get("plan")` → `parsePlanId`
- Plan selector (3 options)
- Fields: org name, address, phone, first/last name, email, password (min 8)
- Submit → `publicApiFetch("/auth/signup", { method: "POST", body: JSON.stringify({ plan, organization: { name, address: address || null, phone: phone || null }, admin: { firstName, lastName, email, password } }) })`
- `setToken` → `router.push("/overview")`
- Link to `/login`
- `Logo` with `href="/"` 

- [ ] **Step 5: Add signup link on login page**

Near the form footer: “New library? Create an account” → `/signup`.

- [ ] **Step 6: Run web unit tests**

```bash
pnpm --filter @libra/web test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/plans.ts apps/web/lib/plans.test.ts apps/web/app/signup/page.tsx apps/web/app/login/page.tsx
git commit -m "feat(web): add self sign-up with plan selection"
```

---

### Task 8: Staff dashboard page

**Files:**
- Create: `apps/web/app/staff/page.tsx`
- Create: `apps/web/components/StaffForm.tsx`
- Modify: `apps/web/components/AppShell.tsx`

**Interfaces:**
- Consumes: `apiFetch`, AppShell patterns from books/members
- Produces: `/staff` CRUD UI; nav link “Staff”

- [ ] **Step 1: Add nav link**

In `AppShell.tsx` `links` array, append `{ href: "/staff", label: "Staff" }`.

- [ ] **Step 2: Implement `StaffForm`**

Fields: firstName, lastName, email, password (required on create; optional on edit with placeholder “Leave blank to keep”).

- [ ] **Step 3: Implement staff page**

Mirror members page:

- `GET /staff` on load
- Modal create/edit via `POST` / `PATCH`
- Delete with `window.confirm`; `DELETE /staff/:id`
- Show API error messages (self-delete / last-admin) in `Alert`
- Do not display password hashes

- [ ] **Step 4: Manual verify**

```bash
just web
```

Login → Staff → add user → logout → login as new staff → see same org data.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/staff/page.tsx apps/web/components/StaffForm.tsx apps/web/components/AppShell.tsx
git commit -m "feat(web): add staff management page"
```

---

### Task 9: Landing page (Daylight Ops · Focused five)

**Files:**
- Replace: `apps/web/app/page.tsx`
- Create: `apps/web/components/landing/LandingNav.tsx`
- Create: `apps/web/components/landing/LandingHero.tsx`
- Create: `apps/web/components/landing/LandingAi.tsx`
- Create: `apps/web/components/landing/LandingPlatform.tsx`
- Create: `apps/web/components/landing/LandingPricing.tsx`
- Create: `apps/web/components/landing/LandingFooterCta.tsx`
- Modify: `apps/web/app/globals.css` (landing-only utilities)
- Modify: `apps/web/app/layout.tsx` metadata description if needed
- Modify: `apps/web/components/Logo.tsx` — allow default `href="/"` for marketing contexts (call sites pass href; login keeps `href={null}` or `/`)

**Interfaces:**
- Consumes: `PLANS`, `formatLkr`, `getToken`, `Logo`
- Produces: public `/` landing; signed-in CTA “Go to dashboard” → `/overview`

- [ ] **Step 1: Landing-only CSS**

Add to `globals.css` (do not change admin token values):

```css
@keyframes landing-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.landing-hero {
  background:
    radial-gradient(ellipse 80% 60% at 20% -10%, #dce8f8 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 90% 10%, #eaf0ff 0%, transparent 50%),
    var(--canvas);
}

.landing-animate {
  animation: landing-fade-up 0.7s ease both;
}

.landing-animate-delay-1 { animation-delay: 0.08s; }
.landing-animate-delay-2 { animation-delay: 0.16s; }
.landing-animate-delay-3 { animation-delay: 0.24s; }
```

- [ ] **Step 2: Section components**

**Nav:** Logo → `/`; anchors `#features`, `#pricing`; Sign in → `/login`; primary Get started → `/signup` OR if `getToken()` then “Go to dashboard” → `/overview`.

**Hero:** Brand “LibraAI” as hero-level signal; headline “AI that runs your library desk.”; one sentence on catalogue/members/loans via dashboard or AI; CTAs “Start with a plan” → `/signup`, “See pricing” → `#pricing`. Full-bleed gradient via `.landing-hero`. No cards in hero. Motion: fade-up on headline/CTAs.

**AI (`#ai`):** “Do everything with AI” + three example prompt chips (books / members / loans). Stagger animation.

**Platform (`#features`):** three feature blocks (Books, Members, Loans) — interaction-oriented layout, not a dense card dashboard.

**Pricing (`#pricing`):** map `PLANS`; Pro highlighted; each CTA → `/signup?plan={id}`; show `formatLkr(priceLkr)` + `/mo`.

**Footer CTA:** “Ready to run your library with AI?” → `/signup`.

Compose in `app/page.tsx` as a client page (needs `getToken`) **or** split: server shell + client nav CTA. Prefer `"use client"` single page for simplicity matching the app.

- [ ] **Step 3: Remove redirect-from-home behavior**

`app/page.tsx` must **not** `router.replace` to login/overview. Always render landing.

- [ ] **Step 4: Update metadata**

```ts
title: "LibraAI | AI Library Management",
description: "Run your library desk with AI — catalogue, members, loans, and plans from LKR 3,000/mo.",
```

- [ ] **Step 5: Manual verify**

Visit `http://localhost:3000/`:

- First viewport: brand, headline, support, CTAs
- Pricing shows 3,000 / 6,000 / 9,000 LKR
- Plan CTA lands on `/signup?plan=pro` (etc.)
- With token in localStorage, nav shows Go to dashboard
- Mobile: no horizontal overflow; hero remains lean

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/page.tsx apps/web/components/landing apps/web/app/globals.css apps/web/app/layout.tsx
git commit -m "feat(web): add Daylight Ops marketing landing page"
```

---

### Task 10: End-to-end verification + README touch

**Files:**
- Modify: `README.md` (signup + multi-tenant note; seed org step)

- [ ] **Step 1: Full API test suite**

```bash
pnpm test:api
pnpm --filter @libra/web test
```

Expected: all PASS.

- [ ] **Step 2: Manual smoke**

1. Open `/` → landing
2. Choose Pro → signup → overview
3. Add book; open Staff; add second admin
4. Logout; login as second admin; see same book
5. Signup second library; confirm empty catalogue (isolation)
6. `just seed` → select/create org → admin works

- [ ] **Step 3: README**

Document:

- Public landing at `/`, signup at `/signup`
- Libraries are organization-scoped
- Seed prompts for organization
- Plans are recorded without payment

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document multi-tenant signup and landing"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| `organizations` + plan enum | Task 1 |
| `organizationId` on admins/books/members | Task 1 |
| Composite ISBN/email uniques | Task 1 |
| Migration backfill | Task 1 |
| JWT `{ sub, orgId, email }` | Task 2 |
| Scope books/members/loans | Task 3 |
| Cross-org loan safety | Task 3 |
| `POST /auth/signup` | Task 4 |
| Seed select/create org | Task 5 |
| Staff API + rules | Task 6 |
| Signup UI + plans LKR | Task 7 |
| Staff UI + nav | Task 8 |
| Landing Daylight Ops / Focused five | Task 9 |
| `/` always landing; dashboard CTA | Task 9 |
| No payments / no plan enforcement | Global + Tasks 4/7/9 |
| Chat widget not on public pages | unchanged AppShell mount |
| README | Task 10 |
