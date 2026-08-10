# Dokploy Separate FE/BE Docker Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add root `Dockerfile.api` and `Dockerfile.web` so Dokploy can deploy the Fastify API and Next.js web app as two independent applications against an external Postgres.

**Architecture:** Multi-stage Node 20 + pnpm builds from the monorepo root. API image installs workspace deps, builds `@libra/db`, runs `tsx src/server.ts`. Web image enables Next `standalone` output (with monorepo `outputFileTracingRoot`), bakes `NEXT_PUBLIC_API_URL` at build time, and runs the standalone Node server. Migrations stay manual.

**Tech Stack:** Docker multi-stage builds, Node 20 Alpine, pnpm 10.32.1, Next.js 16 standalone, Fastify API, Dokploy (two apps, Dockerfile deploy).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-dokploy-docker-deploy-design.md`
- Build context for both images: repository root (`.`)
- Dockerfile paths: `Dockerfile.api`, `Dockerfile.web` at repo root
- No Postgres inside either image; no migrate/seed on container start
- Web runtime: Next Node server (`standalone` / `next start` equivalent), not static export
- pnpm version: `10.32.1` (from `apps/web/package.json` `packageManager`)
- Node: `>=20` (use `node:20-alpine`)
- Do not commit `.env` or secrets into images (use `.dockerignore`)

---

## File Structure

```
.
├── Dockerfile.api                 # Fastify API production image
├── Dockerfile.web                 # Next.js web production image
├── .dockerignore                  # Exclude node_modules, .git, .env*, etc.
├── README.md                      # Add Dokploy deploy section
└── apps/web/next.config.ts        # output: "standalone" + outputFileTracingRoot
```

---

### Task 1: `.dockerignore` + Next standalone config

**Files:**
- Create: `.dockerignore`
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Consumes: nothing
- Produces: Next config with `output: "standalone"` and monorepo tracing root so Docker Task 3 can copy a complete standalone server

- [ ] **Step 1: Create `.dockerignore`**

Create `.dockerignore` at repo root:

```dockerignore
.git
.gitignore
.node-version
.DS_Store

**/node_modules
**/.next
**/dist
**/coverage
**/*.tsbuildinfo

.env
.env.*
!.env.example

docs
agent-transcripts
.cursor
.vscode
.idea

docker-compose.yml
justfile
*.md
!apps/web/README.md

apps/api/src/tests
apps/web/**/*.test.ts
apps/web/**/*.test.tsx
```

Keep `packages/db/drizzle` included (do not ignore it).

- [ ] **Step 2: Enable Next standalone for monorepo**

Replace `apps/web/next.config.ts` with:

```ts
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: trace files from repo root so standalone includes workspace deps.
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
```

If `import.meta.url` is unavailable under the project's Next/TS module settings, use the CommonJS-equivalent form already accepted by the repo's `tsconfig` (e.g. `__dirname` if the config is compiled as CJS). Prefer the smallest change that compiles: at minimum set `output: "standalone"` and `outputFileTracingRoot` to the monorepo root (`path.join(__dirname, "../..")` when `__dirname` is available).

- [ ] **Step 3: Verify Next config typechecks / local build still works (optional smoke)**

Run from repo root (if deps already installed):

```bash
pnpm --filter @libra/web build
```

Expected: build succeeds and `apps/web/.next/standalone` exists.

If local deps are not installed, skip this smoke and rely on Task 3 Docker build.

- [ ] **Step 4: Commit**

```bash
git add .dockerignore apps/web/next.config.ts
git commit -m "$(cat <<'EOF'
chore: add dockerignore and Next standalone output for deploy

EOF
)"
```

---

### Task 2: `Dockerfile.api`

**Files:**
- Create: `Dockerfile.api`

**Interfaces:**
- Consumes: workspace packages `@libra/api`, `@libra/db`; root `pnpm-lock.yaml`
- Produces: image that listens on `0.0.0.0:$PORT` (default 3001) with env `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`

- [ ] **Step 1: Create `Dockerfile.api`**

Create `Dockerfile.api` at repo root:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile --filter @libra/api...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api ./apps/api
COPY packages/db ./packages/db
RUN pnpm --filter @libra/db build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages/db ./packages/db

EXPOSE 3001
ENV PORT=3001

WORKDIR /app/apps/api
CMD ["pnpm", "start"]
```

Notes for the implementer:

- Copying `apps/web/package.json` (manifest only) keeps the pnpm workspace layout valid even though the API image does not build the web app.
- `--filter @libra/api...` installs the API and its workspace dependencies (`@libra/db`).
- If pnpm nested `node_modules` paths differ (hoisting), adjust `COPY --from=deps` so `pnpm --filter @libra/db build` and `pnpm start` succeed. Prefer fixing copy paths over switching package managers.
- Do **not** add migrate/seed to `CMD`.

- [ ] **Step 2: Build the API image**

```bash
docker build -f Dockerfile.api -t libra-api:local .
```

Expected: build completes with exit code 0.

- [ ] **Step 3: Smoke-run container (expects env; may exit if DB unreachable)**

```bash
docker run --rm -e DATABASE_URL=postgresql://libra:libra@host.docker.internal:5432/libra \
  -e JWT_SECRET=test-secret \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e PORT=3001 \
  -p 3001:3001 \
  libra-api:local
```

Expected: process starts and listens (or fails clearly on DB connection — that is acceptable for this smoke if Postgres is not running). Confirm the image entrypoint is `pnpm start` / Fastify, not a migrate script.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile.api
git commit -m "$(cat <<'EOF'
feat: add Dockerfile.api for Dokploy API deploy

EOF
)"
```

---

### Task 3: `Dockerfile.web`

**Files:**
- Create: `Dockerfile.web`
- Modify: none (uses Task 1 `next.config.ts`)

**Interfaces:**
- Consumes: `apps/web` with `output: "standalone"`; build-arg `NEXT_PUBLIC_API_URL`
- Produces: image serving Next standalone on port 3000

- [ ] **Step 1: Create `Dockerfile.web`**

Create `Dockerfile.web` at repo root:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
RUN pnpm install --frozen-lockfile --filter @libra/web...

FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web ./apps/web
RUN pnpm --filter @libra/web build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Next standalone output layout for apps/web in a monorepo
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
```

Notes for the implementer:

- `NEXT_PUBLIC_API_URL` must be provided as a build-arg (Dokploy build-time env / arg). Example: `https://api.example.com` (no trailing path required; client already appends `/...` paths).
- If standalone emits `server.js` at a different relative path, update `CMD` to match the file present under `.next/standalone`.
- If `pnpm --filter @libra/web...` fails because workspace peers require other package folders, copy empty stubs or full package.json set (already included) and reinstall; do not add `@libra/db` source unless the web package depends on it.

- [ ] **Step 2: Build the web image**

```bash
docker build -f Dockerfile.web \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t libra-web:local .
```

Expected: build completes with exit code 0.

- [ ] **Step 3: Smoke-run web container**

```bash
docker run --rm -p 3000:3000 libra-web:local
```

In another terminal:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
```

Expected: HTTP `200` (or `307`/`308` redirect still indicating the server is up). Stop the container after verification.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile.web
git commit -m "$(cat <<'EOF'
feat: add Dockerfile.web for Dokploy web deploy

EOF
)"
```

---

### Task 4: README Dokploy section

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Dockerfile paths and env vars from Tasks 2–3
- Produces: operator instructions for two Dokploy apps + external Postgres + manual migrate/seed

- [ ] **Step 1: Add Dokploy section to README**

Append (or insert after Quick start) a section titled `## Dokploy deploy` with this content (write it into `README.md` as normal markdown, not as a fenced block):

````markdown
## Dokploy deploy

Deploy the API and web app as **two separate Dokploy applications** from this repo. Use a separate Dokploy Postgres (or any external Postgres) — it is not included in either image.

### 1. Database

Create a Postgres instance in Dokploy and copy the connection string as `DATABASE_URL`.

Run migrations manually against that database (from a machine with repo access):

```bash
export DATABASE_URL='postgresql://...'
pnpm install
pnpm db:migrate
pnpm db:seed   # optional: create admin user
```

### 2. API application

| Setting | Value |
|---------|-------|
| Build context | Repository root (`.`) |
| Dockerfile | `Dockerfile.api` |
| Port | `3001` |

Environment variables:

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | yes | Dokploy Postgres URL |
| `JWT_SECRET` | yes | long random string |
| `CORS_ORIGIN` | yes | `https://your-web-domain` |
| `PORT` | no | `3001` |
| `NODE_ENV` | no | `production` |

### 3. Web application

| Setting | Value |
|---------|-------|
| Build context | Repository root (`.`) |
| Dockerfile | `Dockerfile.web` |
| Port | `3000` |

Build-time argument / env (must be available during `docker build`):

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | yes | `https://your-api-domain` |

After changing the API public URL, **rebuild** the web image so the client bundle picks up the new value.

### 4. Local image smoke tests

```bash
docker build -f Dockerfile.api -t libra-api:local .
docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 -t libra-web:local .
```
````

Keep existing local-dev sections (`just`, `docker-compose` for Postgres) unchanged.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: add Dokploy FE/BE Docker deploy instructions

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `Dockerfile.api` at repo root | Task 2 |
| `Dockerfile.web` at repo root | Task 3 |
| `.dockerignore` | Task 1 |
| Next `output: "standalone"` | Task 1 |
| README Dokploy notes | Task 4 |
| External Postgres only | Tasks 2–4 (no DB in images; README) |
| No migrate/seed on start | Task 2 CMD = `pnpm start` only |
| `NEXT_PUBLIC_API_URL` build-arg | Task 3 |
| API env: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT` | Tasks 2, 4 |
| Build context = repo root | Tasks 2–4 |

## Plan self-review

- No TBD/placeholder steps; Dockerfiles and README content are fully specified
- Standalone path and pnpm filter notes call out the only likely adjust-during-implement details
- Tasks are independently reviewable: config → API image → web image → docs
