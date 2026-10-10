# Dokploy Separate FE/BE Docker Deploy

**Date:** 2026-08-10  
**Status:** Approved

## Goal

Deploy `@libra/web` and `@libra/api` as **two independent Dokploy applications**, each built from its own Dockerfile. Postgres is **not** bundled in either image; it is a separate Dokploy (or external) database that the API connects to via `DATABASE_URL`.

## Decisions

| Topic | Choice |
|-------|--------|
| Postgres | Separate Dokploy / external DB (not in FE or BE images) |
| Web runtime | Next.js Node server (`next start`), not static export |
| Migrations on API start | No — run manually / as a one-off job |
| Dockerfile layout | Root `Dockerfile.api` and `Dockerfile.web` |
| Build context | Git repository root for both (pnpm workspace + `@libra/db`) |

## Architecture

```
┌─────────────────┐     NEXT_PUBLIC_API_URL      ┌─────────────────┐
│  Dokploy: Web   │ ───────────────────────────► │  Dokploy: API   │
│  Dockerfile.web │                              │  Dockerfile.api │
│  next start :3000│                              │  Fastify :3001  │
└─────────────────┘                              └────────┬────────┘
                                                          │ DATABASE_URL
                                                          ▼
                                                 ┌─────────────────┐
                                                 │ Dokploy Postgres│
                                                 └─────────────────┘
```

- Two Dokploy apps point at the same Git repo.
- Web app: Dockerfile path `Dockerfile.web`, context `.`
- API app: Dockerfile path `Dockerfile.api`, context `.`
- CORS on the API is set to the public web origin via `CORS_ORIGIN`.

## Deliverables

1. **`Dockerfile.api`** — multi-stage production image for Fastify API
2. **`Dockerfile.web`** — multi-stage production image for Next.js (standalone output)
3. **`.dockerignore`** — exclude `node_modules`, `.git`, `.env*`, local artifacts, and other non-build noise
4. **`apps/web/next.config.ts`** — enable `output: "standalone"` for a lean runtime image
5. **README** — short Dokploy section: two apps, Dockerfile paths, env vars, manual migrate/seed

## API image

### Build

- Base: Node 20 Alpine (or slim)
- Enable pnpm (corepack or pinned installer)
- Copy workspace manifests + lockfile, then package sources needed for API (`apps/api`, `packages/db`, root `package.json` / `pnpm-workspace.yaml`)
- `pnpm install --frozen-lockfile` (filter or full workspace as practical)
- Build `@libra/db` so the compiled `dist` is available
- Runtime uses the existing `start` script (`tsx src/server.ts`); no separate API compile step required

### Runtime

- Working directory suitable for running `@libra/api`
- Command: start API server (equivalent to `pnpm --filter @libra/api start`)
- Listen on `0.0.0.0` and `PORT` (already supported in `server.ts`)
- Expose default `3001`

### Runtime environment

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Dokploy Postgres connection string |
| `JWT_SECRET` | yes | Strong secret in production |
| `CORS_ORIGIN` | yes in prod | Public web URL (e.g. `https://libra.example.com`) |
| `PORT` | no | Default `3001` |
| `NODE_ENV` | no | Set to `production` in Dokploy |

### Explicit non-goals for API container

- No automatic `drizzle-kit migrate` on start
- No interactive seed on start
- No Postgres process inside the image

## Web image

### Build

- Base: Node 20 Alpine (or slim)
- Enable pnpm
- Copy workspace manifests + lockfile and `apps/web` sources (web has no workspace dependency on `@libra/db` today; still build from monorepo root for a single consistent install)
- Pass build-arg `NEXT_PUBLIC_API_URL` so it is inlined into the client bundle
- `pnpm --filter @libra/web build` with Next `output: "standalone"`
- Final stage copies standalone server output + static assets only

### Runtime

- Command: `node apps/web/server.js` (or the standalone path Next emits)
- Expose `3000`
- `NODE_ENV=production`

### Build / runtime environment

| Variable | When | Notes |
|----------|------|-------|
| `NEXT_PUBLIC_API_URL` | **build-time** (Dokploy build arg / env) | Public API URL, e.g. `https://api.example.com` |
| `PORT` | runtime optional | Default Next port `3000` if needed |

## `.dockerignore`

Exclude at minimum:

- `node_modules`, `**/node_modules`
- `.git`
- `.env`, `.env.*`
- test artifacts, coverage, IDE folders
- local Docker volume data if any

Do **not** ignore `packages/db/drizzle` — migration SQL stays available for manual migrate jobs / one-off containers, even though migrate does not run on API start.

## Dokploy operator notes (README)

Document:

1. Create Postgres in Dokploy; copy `DATABASE_URL`.
2. Deploy API app: Dockerfile `Dockerfile.api`, context `.`; set env vars above; set domain.
3. Deploy Web app: Dockerfile `Dockerfile.web`, context `.`; set build arg `NEXT_PUBLIC_API_URL` to the API public URL; set domain.
4. Set API `CORS_ORIGIN` to the Web public origin.
5. Run migrations manually against production `DATABASE_URL` (local machine or one-off container).
6. Seed admin manually when needed (`pnpm db:seed` with production env).

## Out of scope

- Docker Compose for production FE/BE (local `docker-compose.yml` remains Postgres-only for development)
- CI/CD pipeline changes beyond what Dockerfiles need
- Changing API auth, routes, or web UI behavior
- Bundling Postgres with the API
- Auto-migrate / auto-seed on container start

## Success criteria

- `docker build -f Dockerfile.api .` produces a runnable API image
- `docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .` produces a runnable web image
- Dokploy can deploy each as a separate application from the same repo
- API connects to external Postgres via env; web calls API via `NEXT_PUBLIC_API_URL`
- Migrations remain an explicit operator step
