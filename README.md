# LibraAI — Library Management

pnpm monorepo for admin-only library management: books, members, and loans.

## Prerequisites

- Node.js 20+
- pnpm
- Docker

## Setup

```bash
cp .env.example .env
docker compose up -d
pnpm install
export $(grep -v '^#' .env | xargs)
pnpm db:generate
pnpm db:migrate
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:api` | Start Fastify API (future task) |
| `pnpm dev:web` | Start Next.js admin UI (future task) |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to Postgres |
| `pnpm db:seed` | Seed admin user (future task) |
| `pnpm test:api` | Run API tests (future task) |

## Packages

- `@libra/db` — Drizzle schema, migrations, and database client
