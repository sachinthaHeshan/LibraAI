# LibraAI — Library Management

pnpm monorepo for admin-only library management: books, members, and loans.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker with Docker Compose

## Setup

```bash
docker compose up -d
pnpm install
cp .env.example .env
pnpm db:generate && pnpm db:migrate && pnpm db:seed
```

Start the API and web app in separate terminals:

```bash
pnpm dev:api
```

```bash
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the
default seeded administrator:

- Email: `admin@libra.local`
- Password: `admin123`

Change `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` in `.env` for
non-development use, then run `pnpm db:seed` again if the credentials change.

## Available scripts

| Script | Description |
|--------|-------------|
| `pnpm dev:api` | Start the Fastify API on port 3001 |
| `pnpm dev:web` | Start the Next.js admin UI on port 3000 |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to Postgres |
| `pnpm db:seed` | Seed or update the admin user |
| `pnpm test:api` | Run API tests |

## Packages

- `@libra/web` — Next.js admin interface
- `@libra/api` — Fastify REST API
- `@libra/db` — Drizzle schema, migrations, and database client
# LibraAI
