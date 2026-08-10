set dotenv-load := true
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# Run everything: Postgres, migrate, seed, API + web (default)
default: run

# One-shot local stack
run: setup
	just dev

# API + web together
[parallel]
dev: api web

# Install deps, start DB, migrate, seed
setup: env install docker migrate seed

# Create .env from example if missing
env:
	#!/usr/bin/env bash
	if [[ ! -f .env ]]; then
	  cp .env.example .env
	  echo "Created .env from .env.example"
	fi

# Install workspace dependencies
install:
	pnpm install

# Start Postgres (waits until healthy); skips if already reachable
docker:
	#!/usr/bin/env bash
	if docker compose exec -T postgres pg_isready -U libra -d libra >/dev/null 2>&1; then
	  echo "Postgres already running (compose)"
	  exit 0
	fi
	if command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 -U libra >/dev/null 2>&1; then
	  echo "Postgres already reachable on localhost:5432 — skipping compose"
	  exit 0
	fi
	docker compose up -d --wait

# Apply Drizzle migrations
migrate:
	pnpm db:migrate

# Open Drizzle Studio
studio:
	pnpm db:studio

# Seed admin user (prompts for input when run interactively)
seed:
	pnpm --filter @libra/api seed

# Fastify API on :3001
api:
	pnpm dev:api

# Next.js UI on :3000
web:
	pnpm dev:web

# API tests
test:
	pnpm test:api

# Stop Postgres
down:
	docker compose down
