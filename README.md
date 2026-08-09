# LibraAI — Library Management

pnpm monorepo for admin-only library management: books, members, and loans.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker with Docker Compose
- [just](https://github.com/casey/just) (command runner)

## Quick start

One command starts Postgres, runs migrations + seed, and launches API + web:

```bash
just
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the
default seeded administrator:

- Email: `admin@libra.local`
- Password: `admin123`

Change `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` in `.env` for
non-development use, then run `pnpm db:seed` again if the credentials change.

## Available commands

| Command | Description |
|---------|-------------|
| `just` / `just run` | Setup DB + start API and web together |
| `just setup` | Env, install, Postgres, migrate, seed |
| `just api` | Start the Fastify API on port 3001 |
| `just web` | Start the Next.js admin UI on port 3000 |
| `just down` | Stop Postgres |
| `just test` | Run API tests |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to Postgres |
| `pnpm db:seed` | Seed or update the admin user |

## Packages

- `@libra/web` — Next.js admin interface
- `@libra/api` — Fastify REST API
- `@libra/db` — Drizzle schema, migrations, and database client
