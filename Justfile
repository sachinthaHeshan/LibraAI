set dotenv-load
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
set windows-shell := ["cmd.exe", "/c"]

# Run everything: Postgres, migrate, API + web (default)
default: run

# One-shot local stack (does not seed — run `just seed` separately)
run: setup
    just dev

# Setup then API + web in Zellij panes
run-all-zellij: setup
	#!/usr/bin/env bash
	session="libraai"
	root="{{justfile_directory()}}"
	layout="$root/zellij.kdl"

	if ! command -v zellij >/dev/null 2>&1; then
	  echo "zellij is required. Install with: brew install zellij"
	  exit 1
	fi

	cd "$root"

	if [[ -n "${ZELLIJ:-}" ]]; then
	  zellij action new-tab --layout "$layout" --name libraai --cwd "$root"
	  exit 0
	fi

	if zellij list-sessions -n 2>/dev/null | grep -E "^${session} " | grep -qv "EXITED"; then
	  exec zellij attach "$session"
	fi

	if zellij list-sessions -s 2>/dev/null | grep -qx "$session"; then
	  zellij delete-session "$session" --force
	fi

	exec zellij --session "$session" --new-session-with-layout "$layout"

# API + web together
[parallel]
dev: api web

# Install deps, start DB, migrate
setup: env install docker migrate

# Create .env from example if missing
[script("node")]
env:
    const fs = require("fs");
    if (!fs.existsSync(".env")) {
      fs.copyFileSync(".env.example", ".env");
      console.log("Created .env from .env.example");
    }

# Install workspace dependencies
install:
    pnpm install

# Start Postgres (waits until healthy); skips if already reachable
[script("node")]
docker:
    const { execSync } = require("child_process");

    function ok(cmd) {
      try {
        execSync(cmd, { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    }

    if (ok("docker compose exec -T postgres pg_isready -U libra -d libra")) {
      console.log("Postgres already running (compose)");
      process.exit(0);
    }

    const find = process.platform === "win32" ? "where pg_isready" : "command -v pg_isready";
    if (ok(find) && ok("pg_isready -h localhost -p 5432 -U libra")) {
      console.log("Postgres already reachable on localhost:5432 — skipping compose");
      process.exit(0);
    }

    try {
      execSync("docker compose up -d --wait", { stdio: "inherit" });
    } catch (e) {
      process.exit(e.status ?? 1);
    }

# Apply Drizzle migrations
migrate:
    pnpm db:migrate

# Open Drizzle Studio
studio:
    pnpm db:studio

# Seed admin user (prompts for input when run interactively)
seed:
    pnpm --filter @libra/api seed

# Embed the book catalog into pgvector (requires GOOGLE_GENERATIVE_AI_API_KEY)
index-books:
	pnpm --filter @libra/api index-books

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
