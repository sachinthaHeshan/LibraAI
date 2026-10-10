# LibraAI — Library Management

pnpm monorepo for multi-tenant library management: organizations, books,
members, loans, and staff admins.

## Product notes

- Public marketing landing lives at `/`; self-serve signup is at `/signup`
- Each library is an **organization** — books, members, loans, and admins are
  scoped to that org (composite uniqueness for ISBN/email per org)
- Chosen plans (Starter / Pro / Enterprise) are **recorded without payment** —
  no billing or plan enforcement yet
- `just seed-admin` / `pnpm db:seed-admin` prompts you to select or create an
  organization, then create or update an admin in that org
- `just seed-catalog` / `pnpm db:seed-catalog` upserts the sample catalog into
  an existing organization (matching ISBNs get updated descriptions)

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
just seed-admin
```

To insert the sample catalog into an existing organization:

```bash
just seed-catalog
```

Change `JWT_SECRET` in `.env` for non-development use.

## AI catalog search

LibraAI includes a Mastra **SearchAgent** that answers book questions with org-scoped hybrid retrieval: Postgres full-text search (`tsvector` + `ts_rank_cd`) fused with Gemini embeddings in pgvector using Reciprocal Rank Fusion. Exact title, author, and ISBN matches are boosted.

1. Use Postgres with the `vector` extension. Local Compose uses `pgvector/pgvector:pg16`. If you already had a `postgres:16-alpine` volume, recreate it (`just down` then `docker volume rm libraai_pgdata`, or a fresh DB). **Hosted Postgres** (Dokploy or any remote instance) must have pgvector installed; as a superuser run `CREATE EXTENSION IF NOT EXISTS vector;`.
2. Apply migrations so `books.search_vector` exists (`just migrate` / `pnpm db:migrate`).
3. Add keys to `.env`. Chat uses Anthropic; catalog embeddings still use Google:

```bash
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key
```

`GOOGLE_API_KEY` is accepted as a fallback for embeddings.

4. Seed an admin, then upsert the sample catalog (re-run this after pulling description updates):

```bash
just seed-admin
just seed-catalog
```

5. Embed the catalog (skipped automatically during API tests):

```bash
just index-books
```

6. Sign in and ask in the chat widget, overview ask bar, or `/chat`. Example queries:
   - “Recommend something like Tolkien”
   - “Do we have Atomic Habits?”
   - “Science fiction about a desert planet”

Book create/update also re-embeds when a Google key is present. Add a **genre** and **description** on each title so both full-text search and embeddings have enough text.

The chat API is authenticated `POST /ai/chat` with `{ "messages": [{ "role": "user", "content": "..." }] }`.

### Responsible AI

Chat requests pass a deterministic safety policy, PII masking, and a per-user rate limit before
any model runs. Replies carry provenance metadata (agents, tools, refusal code) shown in the UI,
and each AI request is written to an append-only `ai_audit_events` table that owners can read at
`GET /ai/audit-events`. See [docs/responsible-ai.md](docs/responsible-ai.md).

## Dokploy deploy

Deploy the API and web app as **two separate Dokploy applications** from this repo. Use a separate Dokploy Postgres (or any external Postgres) — it is not included in either image.

### 1. Database

Create a Postgres instance in Dokploy and copy the connection string as `DATABASE_URL`.

Run migrations manually against that database (from a machine with repo access):

```bash
export DATABASE_URL='postgresql://...'
pnpm install
pnpm db:migrate
pnpm db:seed-admin   # optional: select/create org + admin
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
| `ANTHROPIC_API_KEY` | yes (for AI chat) | Anthropic API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes (for embeddings) | Google AI Studio key |
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
| `just seed-admin` | Prompt to select/create an org and admin |
| `just seed-catalog` | Upsert the sample catalog (including improved descriptions) into an existing organization |
| `just index-books` | Embed the book catalog into pgvector (needs a Google API key) |
| `just api` | Start the Fastify API on port 3001 |
| `just web` | Start the Next.js admin UI on port 3000 |
| `just down` | Stop Postgres |
| `just test` | Run API tests |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Apply migrations to Postgres |
| `pnpm db:seed-admin` | Prompt to select/create an org and admin |
| `pnpm db:seed-catalog` | Upsert the sample catalog into an existing organization |

## Packages

- `@libra/web` — Next.js landing, signup, and admin UI
- `@libra/api` — Fastify REST API
- `@libra/db` — Drizzle schema, migrations, and database client
