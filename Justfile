set dotenv-load
set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
set windows-shell := ["cmd.exe", "/c"]

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
