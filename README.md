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
| Port | `3451` |

Environment variables:

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | yes | Dokploy Postgres URL |
| `JWT_SECRET` | yes | long random string |
| `CORS_ORIGIN` | yes | `https://your-web-domain` |
| `PORT` | no | `3451` |
| `NODE_ENV` | no | `production` |

### 3. Web application

| Setting | Value |
|---------|-------|
| Build context | Repository root (`.`) |
| Dockerfile | `Dockerfile.web` |
| Port | `3450` |

**Runtime** environment on the web app (Dokploy Environment):

| Variable | Required | Example |
|----------|----------|---------|
| `API_URL` | yes | `https://libraai-api.orionlabs.lk` |

`NEXT_PUBLIC_API_URL` is accepted as a fallback. The browser calls same-origin `/backend/...`; the Next server proxies to `API_URL`. Prefer `API_URL` (not only a build arg).

After setting env, **redeploy/restart** the web container.

API `CORS_ORIGIN` can stay your web origin; browser traffic goes through the proxy so CORS is not required for login from the UI.

### 4. Local image smoke tests

```bash
docker build -f Dockerfile.api -t libra-api:local .
docker build -f Dockerfile.web -t libra-web:local .
docker run --rm -e API_URL=http://host.docker.internal:3001 -p 3450:3450 libra-web:local
```

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
