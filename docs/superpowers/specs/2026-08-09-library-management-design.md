# Library Management System — Design Spec

**Date:** 2026-08-09  
**Status:** Approved for planning

## Summary

Admin-only library management system: Next.js frontend + Fastify REST API + PostgreSQL via Drizzle, in a pnpm monorepo. Covers books, members (patrons as data, not login users), and borrow/return with librarian-chosen due dates.

## Goals

- Full CRUD for books and members
- Issue / return loans; view currently borrowed books and due dates
- Simple admin JWT login (single role: admin)
- Frontend bound to backend APIs end-to-end

## Non-goals (v1)

- Member/self-service portal or additional roles
- Per-copy barcodes / physical copy tracking
- Fines, renewals, reservations
- Heavy E2E test suite

## Architecture

```
LibraAI/
├── apps/
│   ├── web/          # Next.js (App Router) — admin UI
│   └── api/          # Fastify — REST + JWT
├── packages/
│   └── db/           # Drizzle schema, migrations, DB client
├── docker-compose.yml  # PostgreSQL
└── package.json      # pnpm workspaces
```

- **web** calls **api** over HTTP using `NEXT_PUBLIC_API_URL`
- **api** owns auth and business rules; uses `@libra/db` for queries
- **db** package holds Drizzle schema + migrations
- CORS enabled for the Next.js origin
- Seed one admin user after migrate

## Data model

### `admins`

| Field | Notes |
|-------|--------|
| id | UUID PK |
| email | unique |
| passwordHash | bcrypt |
| createdAt | timestamp |

### `books`

| Field | Notes |
|-------|--------|
| id | PK |
| title | required |
| author | required |
| isbn | unique |
| totalCopies | integer ≥ 1 |
| availableCopies | integer ≥ 0, ≤ totalCopies |
| publishedYear | optional |
| createdAt, updatedAt | timestamps |

### `members`

Patrons stored as records only — they do not log in.

| Field | Notes |
|-------|--------|
| id | PK |
| name | required |
| email | unique |
| phone | optional |
| membershipDate | date |
| status | `active` \| `inactive` |
| createdAt, updatedAt | timestamps |

### `loans`

| Field | Notes |
|-------|--------|
| id | PK |
| bookId | FK → books |
| memberId | FK → members |
| issuedAt | timestamp |
| dueDate | required; set by librarian at issue |
| returnedAt | nullable |
| status | `borrowed` \| `returned` (overdue derived when borrowed and dueDate < today) |

### Business rules

- **Issue:** require `availableCopies > 0` and member `status === active`; create loan; decrement `availableCopies`
- **Return:** set `returnedAt` and status `returned`; increment `availableCopies`
- **Delete book:** blocked if open (`borrowed`) loans exist → `409`
- **Delete member:** blocked if open loans exist → `409`
- **Search books:** by title, author, and/or isbn (`?q=`)

## Auth

- Admin-only application; one role
- `POST /auth/login` → JWT
- All `/books`, `/members`, `/loans` routes require `Authorization: Bearer <token>`
- Frontend stores token and attaches it to requests; unauthenticated users redirected to `/login`
- Seed default admin credentials documented in README (changeable via env)

## API

### Auth

- `POST /auth/login` — `{ email, password }` → `{ token }`

### Books

- `GET /books?q=` — list + search
- `GET /books/:id`
- `POST /books`
- `PATCH /books/:id`
- `DELETE /books/:id`

### Members

- `GET /members`
- `GET /members/:id`
- `POST /members`
- `PATCH /members/:id`
- `DELETE /members/:id`

### Loans

- `POST /loans` — `{ bookId, memberId, dueDate }` issue
- `POST /loans/:id/return` — record return
- `GET /loans?status=borrowed` — currently borrowed (include due dates; expose overdue flag)

## Frontend

Pages:

- `/login`
- `/books` — list, search, add / edit / delete
- `/members` — list, add / edit / delete
- `/loans` — issue form, return action, borrowed list with due dates

Shell: simple admin nav. Forms for create/edit; tables for lists. No member-facing UI.

## Error handling

- Request validation on write endpoints (Zod or TypeBox)
- HTTP statuses: `400` validation / domain (no copies, inactive member), `401` auth, `404` not found, `409` duplicate ISBN/email or delete blocked by open loans
- Frontend surfaces API error messages on forms / inline alerts

## Testing (lean)

- API smoke tests: auth login; issue/return happy path; issue when no copies left
- Manual FE verification of CRUD against running API
- No heavy E2E in v1

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js App Router, TypeScript, Tailwind |
| Backend | Fastify, `@fastify/cors`, `@fastify/jwt` |
| ORM | Drizzle + drizzle-kit |
| DB | PostgreSQL (Docker Compose) |
| Workspace | pnpm |

## Environment (high level)

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL`
- Admin seed: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (or documented defaults)
