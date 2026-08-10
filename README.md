# LibraAI — Library Management

pnpm monorepo for admin-only library management: books, members, and loans.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker with Docker Compose
- [just](https://github.com/casey/just) (command runner)

## Quick start

One command starts Postgres, runs migrations, prompts for an admin user, and
launches API + web:

```bash
just
```

On first run you'll be asked for the administrator's first name, last name,
email, and password. Use those credentials to sign in at
[http://localhost:3000](http://localhost:3000).

To create or update an admin later:

```bash
just seed
```

Change `JWT_SECRET` in `.env` for non-development use.

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
| `pnpm db:seed` | Prompt to create or update an admin user |

## Packages

- `@libra/web` — Next.js admin interface
- `@libra/api` — Fastify REST API
- `@libra/db` — Drizzle schema, migrations, and database client
