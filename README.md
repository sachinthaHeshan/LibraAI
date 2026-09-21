# LibraAI — Library Management

pnpm monorepo for multi-tenant library management: organizations, books,
members, loans, and staff admins.

## Product notes

- Public marketing landing lives at `/`; self-serve signup is at `/signup`
- Each library is an **organization** — books, members, loans, and admins are
  scoped to that org (composite uniqueness for ISBN/email per org)
- Chosen plans (Starter / Pro / Enterprise) are **recorded without payment** —
  no billing or plan enforcement yet
- `just seed` / `pnpm db:seed` prompts you to select or create an organization,
  then create or update an admin in that org

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker with Docker Compose
- [just](https://github.com/casey/just) (command runner)
- [Zellij](https://zellij.dev) (optional, for `just run-all-zellij`)

## Quick start

One command starts Postgres, runs migrations, and launches API + web:

```bash
just
```

Open [http://localhost:3000](http://localhost:3000) for the public landing, or
[http://localhost:3000/signup](http://localhost:3000/signup) to create a new
library. Sign in to reach the admin dashboard.

To create or update an admin (prompts for organization):

```bash
just seed
```

Change `JWT_SECRET` in `.env` for non-development use.

## AI catalog search

LibraAI includes a Mastra **SearchAgent** that answers book questions with org-scoped vector RAG (Gemini + pgvector).

1. Use Postgres with the `vector` extension. Local Compose uses `pgvector/pgvector:pg16`. If you already had a `postgres:16-alpine` volume, recreate it (`just down` then `docker volume rm libraai_pgdata`, or a fresh DB). **Hosted Postgres** (Dokploy or any remote instance) must have pgvector installed; as a superuser run `CREATE EXTENSION IF NOT EXISTS vector;`.
2. Add a Google AI key to `.env`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-key
```

`GOOGLE_API_KEY` is accepted as a fallback.

3. Seed an admin (this also inserts a sample catalog when the org has no matching ISBNs):

```bash
just seed
```

4. Embed the catalog (skipped automatically during API tests):

```bash
just index-books
```

5. Sign in and ask in the chat widget, overview ask bar, or `/chat`. Example queries:
   - “Recommend something like Tolkien”
   - “Do we have Atomic Habits?”
   - “Science fiction about a desert planet”

Book create/update also re-embeds when a Google key is present. Add a **genre** and **description** on each title so semantic search has enough text.

The chat API is authenticated `POST /ai/chat` with `{ "messages": [{ "role": "user", "content": "..." }] }`.

## Dokploy deploy

Deploy the API and web app as **two separate Dokploy applications** from this repo. Use a separate Dokploy Postgres (or any external Postgres) — it is not included in either image.

### 1. Database

Create a Postgres instance in Dokploy and copy the connection string as `DATABASE_URL`.

Run migrations manually against that database (from a machine with repo access):

```bash
export DATABASE_URL='postgresql://...'
pnpm install
pnpm db:migrate
pnpm db:seed   # optional: select/create org + admin
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
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes (for AI search) | Google AI Studio key |
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
| `just` / `just run` | Setup DB + start API and web together (does not seed) |
| `just run-all-zellij` | Same as `just run`, with API and web in Zellij panes |
| `just setup` | Env, install, Postgres, migrate |
| `just seed` | Prompt to select/create an org and admin (also seeds a sample catalog) |
| `just index-books` | Embed the book catalog into pgvector (needs a Google API key) |
| `just api` | Start the Fastify API on port 3001 |
| `just web` | Start the Next.js admin UI on port 3000 |
| `just down` | Stop Postgres |
| `just test` | Run API tests |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to Postgres |
| `pnpm db:seed` | Prompt to select/create an org and admin |

## Packages

- `@libra/web` — Next.js landing, signup, and admin UI
- `@libra/api` — Fastify REST API
- `@libra/db` — Drizzle schema, migrations, and database client
