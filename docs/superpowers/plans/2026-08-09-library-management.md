# Library Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only library management system with Next.js frontend, Fastify API, and PostgreSQL/Drizzle covering books, members, and borrow/return CRUD end-to-end.

**Architecture:** pnpm monorepo with `apps/api` (Fastify + JWT), `apps/web` (Next.js App Router), and `packages/db` (Drizzle schema/migrations). Web calls API over HTTP; API owns all business rules.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind, Fastify, `@fastify/cors`, `@fastify/jwt`, Zod, bcrypt, Drizzle ORM, PostgreSQL, pnpm workspaces, Docker Compose, Vitest (API smoke tests).

## Global Constraints

- Admin-only auth — members are patron records, not login users
- Book inventory is title-level (`totalCopies` / `availableCopies`), not per physical copy
- Due date is required and chosen by librarian at issue time
- Delete book/member returns `409` if open loans exist
- Package name for DB: `@libra/db`
- Default ports: API `3001`, web `3000`, Postgres `5432`

---

## File Structure

```
LibraAI/
├── package.json
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .gitignore
├── .env.example
├── README.md
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── app.ts
│   │       ├── env.ts
│   │       ├── plugins/auth.ts
│   │       ├── lib/errors.ts
│   │       ├── routes/auth.ts
│   │       ├── routes/books.ts
│   │       ├── routes/members.ts
│   │       ├── routes/loans.ts
│   │       └── scripts/seed.ts
│   │   └── src/tests/
│   │       ├── setup.ts
│   │       ├── auth.test.ts
│   │       └── loans.test.ts
│   └── web/
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   ├── page.tsx
│       │   ├── login/page.tsx
│       │   ├── books/page.tsx
│       │   ├── members/page.tsx
│       │   └── loans/page.tsx
│       ├── components/
│       │   ├── AppShell.tsx
│       │   ├── BookForm.tsx
│       │   ├── MemberForm.tsx
│       │   └── IssueLoanForm.tsx
│       └── lib/
│           ├── api.ts
│           └── auth.ts
└── packages/
    └── db/
        ├── package.json
        ├── tsconfig.json
        ├── drizzle.config.ts
        └── src/
            ├── index.ts
            ├── client.ts
            └── schema.ts
```

---

### Task 1: Monorepo scaffold + Postgres + Drizzle schema

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.env.example`, `docker-compose.yml`, `README.md`
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/src/schema.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`

**Interfaces:**
- Produces: tables `admins`, `books`, `members`, `loans`; exports `db`, schema tables, and types from `@libra/db`

- [ ] **Step 1: Create workspace root files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Root `package.json`:
```json
{
  "name": "libraai",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter @libra/api dev",
    "dev:web": "pnpm --filter @libra/web dev",
    "db:generate": "pnpm --filter @libra/db generate",
    "db:migrate": "pnpm --filter @libra/db migrate",
    "db:seed": "pnpm --filter @libra/api seed",
    "test:api": "pnpm --filter @libra/api test"
  },
  "engines": {
    "node": ">=20"
  }
}
```

`.gitignore`:
```
node_modules
.next
dist
.env
.env.local
*.log
coverage
packages/db/drizzle/meta
```

`docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: libra
      POSTGRES_PASSWORD: libra
      POSTGRES_DB: libra
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`.env.example`:
```
DATABASE_URL=postgresql://libra:libra@localhost:5432/libra
JWT_SECRET=change-me-in-production
ADMIN_EMAIL=admin@libra.local
ADMIN_PASSWORD=admin123
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 2: Create `@libra/db` package**

`packages/db/package.json`:
```json
{
  "name": "@libra/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "drizzle-orm": "^0.39.3",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.4",
    "typescript": "^5.7.3"
  }
}
```

`packages/db/src/schema.ts`:
```ts
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

export const memberStatusEnum = pgEnum("member_status", ["active", "inactive"]);
export const loanStatusEnum = pgEnum("loan_status", ["borrowed", "returned"]);

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn").notNull().unique(),
  totalCopies: integer("total_copies").notNull(),
  availableCopies: integer("available_copies").notNull(),
  publishedYear: integer("published_year"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  membershipDate: date("membership_date").notNull(),
  status: memberStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const loans = pgTable("loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  dueDate: date("due_date").notNull(),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  status: loanStatusEnum("status").notNull().default("borrowed"),
});
```

`packages/db/src/client.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
```

`packages/db/src/index.ts`:
```ts
export * from "./schema.js";
export * from "./client.js";
```

`packages/db/drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Start Postgres, install deps, generate + migrate**

```bash
cp .env.example .env
docker compose up -d
pnpm install
# load DATABASE_URL then:
export $(grep -v '^#' .env | xargs)
pnpm db:generate
pnpm db:migrate
```

Expected: migration SQL created under `packages/db/drizzle/`; tables exist in Postgres.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore .env.example docker-compose.yml packages/db README.md
git commit -m "chore: scaffold monorepo with Drizzle schema and Postgres"
```

---

### Task 2: Fastify app shell + auth login + seed

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/env.ts`, `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/src/plugins/auth.ts`, `apps/api/src/lib/errors.ts`, `apps/api/src/routes/auth.ts`, `apps/api/src/scripts/seed.ts`, `apps/api/vitest.config.ts`, `apps/api/src/tests/setup.ts`, `apps/api/src/tests/auth.test.ts`

**Interfaces:**
- Consumes: `@libra/db` (`admins`, `createDb`)
- Produces: `buildApp()` → Fastify instance; `POST /auth/login`; `authenticate` preHandler; seeded admin

- [ ] **Step 1: Write failing auth test**

`apps/api/src/tests/auth.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../app.js";

describe("POST /auth/login", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  it("returns jwt for valid admin credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: process.env.ADMIN_EMAIL ?? "admin@libra.local",
        password: process.env.ADMIN_PASSWORD ?? "admin123",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf("string");
  });

  it("returns 401 for bad password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@libra.local", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @libra/api test
```

Expected: FAIL (module/app not found)

- [ ] **Step 3: Implement API shell, auth plugin, login route, seed**

`apps/api/package.json` scripts: `dev` (`tsx watch src/index.ts`), `seed` (`tsx src/scripts/seed.ts`), `test` (`vitest run`).

Dependencies: `fastify`, `@fastify/cors`, `@fastify/jwt`, `zod`, `bcryptjs`, `@libra/db`, `dotenv`. Dev: `tsx`, `typescript`, `vitest`, `@types/bcryptjs`, `@types/node`.

`apps/api/src/env.ts` — load dotenv; export `env` with `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT` (default 3001), `CORS_ORIGIN` (default `http://localhost:3000`).

`apps/api/src/lib/errors.ts`:
```ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
```

`apps/api/src/plugins/auth.ts` — decorate `authenticate` that calls `request.jwtVerify()`; on failure reply 401.

`apps/api/src/routes/auth.ts`:
```ts
// POST /auth/login
// body: { email: string, password: string }
// lookup admin by email; bcrypt.compare; on success reply { token: jwt.sign({ sub: admin.id, email }) }
// on failure AppError 401 "Invalid credentials"
```

`apps/api/src/app.ts` — create Fastify; register cors + jwt; set error handler mapping `AppError` → status; register auth routes; export `buildApp`.

`apps/api/src/scripts/seed.ts` — upsert admin by `ADMIN_EMAIL` with bcrypt hash of `ADMIN_PASSWORD`.

`apps/api/src/index.ts` — `buildApp().listen({ port: env.PORT, host: "0.0.0.0" })`.

- [ ] **Step 4: Seed and run tests**

```bash
pnpm db:seed
pnpm --filter @libra/api test src/tests/auth.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): add Fastify shell, JWT login, and admin seed"
```

---

### Task 3: Books CRUD API

**Files:**
- Create: `apps/api/src/routes/books.ts`
- Modify: `apps/api/src/app.ts` (register books routes with `authenticate`)

**Interfaces:**
- Consumes: `books`, `loans` tables; `authenticate`
- Produces:
  - `GET /books?q=` → `Book[]`
  - `GET /books/:id` → `Book`
  - `POST /books` → `Book` body `{ title, author, isbn, totalCopies, publishedYear? }` sets `availableCopies = totalCopies`
  - `PATCH /books/:id` → `Book`
  - `DELETE /books/:id` → `204` or `409` if open loans

- [ ] **Step 1: Implement books routes with Zod validation**

Validation:
```ts
const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(1),
  totalCopies: z.number().int().min(1),
  publishedYear: z.number().int().optional(),
});
```

Search: when `q` present, `ilike` on title OR author OR isbn.

On create: `availableCopies = totalCopies`.

On PATCH: if `totalCopies` changes, adjust carefully — never set `totalCopies` below `totalCopies - availableCopies` (copies currently out); recompute or validate `availableCopies` stays consistent. Simplest rule: reject PATCH that would set `totalCopies < (totalCopies - availableCopies)` with 400.

On DELETE: if any loan with `status = 'borrowed'` for book → `409` `"Book has open loans"`.

Unique ISBN violation → `409`.

- [ ] **Step 2: Manual smoke via inject or curl**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@libra.local","password":"admin123"}' | jq -r .token)
curl -s -X POST http://localhost:3001/books \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Dune","author":"Frank Herbert","isbn":"9780441172719","totalCopies":3}'
```

Expected: `201` with `availableCopies: 3`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/books.ts apps/api/src/app.ts
git commit -m "feat(api): add books CRUD with search"
```

---

### Task 4: Members CRUD API

**Files:**
- Create: `apps/api/src/routes/members.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Produces:
  - `GET /members`, `GET /members/:id`
  - `POST /members` body `{ name, email, phone?, membershipDate, status? }`
  - `PATCH /members/:id`, `DELETE /members/:id` (`409` if open loans)

- [ ] **Step 1: Implement members routes**

```ts
const createMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  membershipDate: z.string(), // YYYY-MM-DD
  status: z.enum(["active", "inactive"]).optional(),
});
```

Duplicate email → `409`. Delete blocked by open loans → `409` `"Member has open loans"`.

- [ ] **Step 2: Smoke create + list**

```bash
curl -s -X POST http://localhost:3001/members \
  -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","membershipDate":"2026-01-01"}'
```

Expected: `201`

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/members.ts apps/api/src/app.ts
git commit -m "feat(api): add members CRUD"
```

---

### Task 5: Loans issue/return API + smoke tests

**Files:**
- Create: `apps/api/src/routes/loans.ts`, `apps/api/src/tests/loans.test.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Produces:
  - `POST /loans` `{ bookId, memberId, dueDate }` → loan; decrements `availableCopies`
  - `POST /loans/:id/return` → loan; increments `availableCopies`
  - `GET /loans?status=borrowed` → loans with book/member join + `overdue: boolean`

- [ ] **Step 1: Write failing loans tests**

```ts
describe("loans", () => {
  it("issues a book and decrements availableCopies", async () => { /* login, create book copies=1, member, POST /loans, expect availableCopies 0 */ });
  it("rejects issue when no copies left", async () => { /* second issue → 400 */ });
  it("returns a book and increments availableCopies", async () => { /* POST /loans/:id/return → availableCopies 1 */ });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm --filter @libra/api test src/tests/loans.test.ts
```

- [ ] **Step 3: Implement loans routes**

Issue transaction:
1. Load book + member
2. If !book or !member → 404
3. If member.status !== 'active' → 400 `"Member is inactive"`
4. If book.availableCopies < 1 → 400 `"No copies available"`
5. Insert loan (`status: borrowed`, `dueDate`); update book `availableCopies - 1`

Return transaction:
1. Load loan; if missing → 404; if already returned → 400
2. Set `returnedAt = now()`, `status = returned`
3. Increment book `availableCopies`

List: join book title + member name; `overdue = status === 'borrowed' && dueDate < today (UTC date)`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm --filter @libra/api test
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/loans.ts apps/api/src/tests/loans.test.ts apps/api/src/app.ts
git commit -m "feat(api): add issue/return loans with availability rules"
```

---

### Task 6: Next.js app shell + API client + login

**Files:**
- Create: `apps/web/*` (Next.js + Tailwind), `apps/web/lib/api.ts`, `apps/web/lib/auth.ts`, `apps/web/components/AppShell.tsx`, `apps/web/app/login/page.tsx`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`

**Interfaces:**
- Consumes: `POST /auth/login`
- Produces: `apiFetch(path, options)` attaching Bearer token from `localStorage`; redirect to `/login` on 401

- [ ] **Step 1: Scaffold Next.js app in workspace**

```bash
pnpm create next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm --turbopack
```

Set `apps/web/package.json` name to `@libra/web`. Add `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 2: Implement auth helpers + login page**

`lib/auth.ts`:
```ts
const TOKEN_KEY = "libra_token";
export function getToken(): string | null { return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }
```

`lib/api.ts`:
```ts
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```

Login page: email/password form → `apiFetch` won't attach yet; call login endpoint, `setToken`, `router.push("/books")`.

`AppShell`: nav links Books / Members / Loans / Logout.

Root `page.tsx`: redirect to `/books` or `/login` based on token (client component).

- [ ] **Step 3: Verify login manually**

```bash
pnpm dev:api   # terminal 1
pnpm dev:web   # terminal 2
```

Open `http://localhost:3000/login`, sign in with seeded admin. Expected: redirect to `/books`.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js admin shell and login"
```

---

### Task 7: Books + Members UI bound to API

**Files:**
- Create: `apps/web/app/books/page.tsx`, `apps/web/app/members/page.tsx`, `apps/web/components/BookForm.tsx`, `apps/web/components/MemberForm.tsx`

**Interfaces:**
- Consumes: books + members API endpoints via `apiFetch`

- [ ] **Step 1: Books page**

- Search input (`q`) debounced or on submit → `GET /books?q=`
- Table: title, author, isbn, available/total, actions Edit/Delete
- Add/Edit modal or inline form via `BookForm` → POST/PATCH
- Delete with confirm → DELETE; show error message on 409

- [ ] **Step 2: Members page**

- Table: name, email, phone, status, membershipDate
- Add/Edit form → POST/PATCH
- Delete with confirm; surface 409 errors

- [ ] **Step 3: Manual verify CRUD**

Create, search, edit, delete a book and a member in the UI against running API.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/books apps/web/app/members apps/web/components
git commit -m "feat(web): bind books and members CRUD to API"
```

---

### Task 8: Loans UI + README polish

**Files:**
- Create: `apps/web/app/loans/page.tsx`, `apps/web/components/IssueLoanForm.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `GET /loans?status=borrowed`, `POST /loans`, `POST /loans/:id/return`, plus books/members lists for selects

- [ ] **Step 1: Loans page**

- `IssueLoanForm`: select book (show available), select active member, date input for dueDate → `POST /loans`
- Table of borrowed loans: book title, member name, dueDate, overdue badge, Return button → `POST /loans/:id/return`
- Refresh list after issue/return; show API errors inline

- [ ] **Step 2: End-to-end manual check**

1. Login  
2. Add book (1 copy) + member  
3. Issue loan with due date  
4. Confirm book availableCopies shows 0  
5. Return loan  
6. Confirm availableCopies back to 1  

- [ ] **Step 3: Update README**

Document: prerequisites (Node 20+, Docker, pnpm), `docker compose up -d`, `pnpm install`, copy `.env`, `pnpm db:generate && pnpm db:migrate && pnpm db:seed`, `pnpm dev:api` + `pnpm dev:web`, default admin credentials.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/loans apps/web/components/IssueLoanForm.tsx README.md
git commit -m "feat(web): bind loans issue/return UI and document setup"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Monorepo Next + Fastify + Drizzle + Postgres | 1 |
| Admin JWT login + seed | 2, 6 |
| Books CRUD + search | 3, 7 |
| Members CRUD | 4, 7 |
| Issue / return / borrowed list + due dates | 5, 8 |
| availableCopies rules / inactive member | 5 |
| Delete blocked by open loans | 3, 4 |
| Frontend bound to API | 6–8 |
| Lean API smoke tests | 2, 5 |
| Docker Compose + env docs | 1, 8 |

## Self-review notes

- No TBD placeholders
- Types consistent: UUID string IDs; loan status `borrowed` \| `returned`; overdue derived on read
- Members never authenticate
- Validation via Zod on write endpoints
