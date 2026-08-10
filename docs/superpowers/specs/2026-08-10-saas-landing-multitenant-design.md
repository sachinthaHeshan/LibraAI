# SaaS Landing, Multi-Tenant Orgs & Self Sign-Up — Design Spec

**Date:** 2026-08-10  
**Status:** Approved for planning

## Summary

Turn LibraAI into a light multi-tenant library SaaS: each signup creates an organization (library) with a pricing plan, org-scoped data, self-serve admin registration, staff management, and a public marketing landing page at `/` that highlights AI-powered library operations and LKR pricing.

## Goals

- Organizations own library data (books, members) and admins
- Public self sign-up with plan selection + library details + admin credentials (no payments)
- Seed script can create or select an organization before creating an admin
- Dashboard **Staff** section to add/edit/remove admins in the current org (flat permissions)
- Premium public landing page describing the platform, AI capabilities, and pricing
- `/` always shows the landing page; signed-in users get a “Go to dashboard” affordance

## Non-goals

- Payment gateways or invoicing
- Enforcing plan limits in the API (marketing copy only)
- Role hierarchy beyond flat org admins
- Real LLM-backed “do everything with AI” actions beyond the existing chat widget behavior
- Member/patron login portal
- Separate database or schema per organization

## Architecture approach

**Org-scoped schema + JWT `orgId`.**

```
Public:     /  → landing
            /signup?plan=…  → create org + first admin
            /login          → JWT { sub, orgId, email }

Auth API:   POST /auth/signup
            POST /auth/login  (JWT includes orgId)

Staff API:  CRUD /staff (scoped to JWT orgId)

Library:    books / members / loans queries filter by organization
```

Delivery order for implementation:

1. Multi-tenant core (schema, JWT, scope existing routes)
2. Self sign-up
3. Seed update (create/select org)
4. Staff management UI + API
5. Landing page

## Data model

### `organizations`

| Field | Notes |
|-------|--------|
| id | UUID PK |
| name | Library / org name (required) |
| address | Optional text |
| phone | Optional |
| plan | Enum: `starter` \| `pro` \| `enterprise` |
| createdAt | timestamptz |

### `admins` (extended)

| Field | Notes |
|-------|--------|
| existing fields | id, firstName, lastName, email (unique globally), passwordHash, createdAt |
| organizationId | FK → organizations, required |

### `books` / `members`

| Field | Notes |
|-------|--------|
| organizationId | FK → organizations, required |
| Existing uniqueness | ISBN unique **per organization**; member email unique **per organization** (composite unique preferred over global) |

### `loans`

No new column required if always queried via book/member that belong to the org. API must still ensure issued loans cannot cross organizations (book and member must share the same `organizationId`).

### Migration of existing data

1. Create a default organization (e.g. name “Default Library”, plan `pro`)
2. Attach all existing admins, books, and members to that organization
3. Make `organizationId` NOT NULL after backfill

## Auth & JWT

- Login and signup return the same token shape: `{ sub: adminId, orgId, email }`
- Protected routes resolve `orgId` from the verified JWT (never from client body for scoping)
- All list/create/update/delete for books, members, loans, and staff filter by that `orgId`

## Sign-up

**Route:** `POST /auth/signup`  
**UI:** `/signup` with optional `?plan=starter|pro|enterprise` (default `pro`)

**Payload:**

- Plan
- Organization: name (required), address, phone
- Admin: firstName, lastName, email, password

**Behavior:** create organization, create first admin, return JWT. Frontend redirects to `/overview`.

**Errors:** `400` validation; `409` duplicate email.

## Login

Existing login UX; response JWT gains `orgId`. Frontend unchanged except token consumers that need org context later.

## Seed

Update `just seed` / seed script:

1. List existing organizations; allow selecting one **or** creating a new one (name, plan, optional address/phone)
2. Prompt for admin credentials
3. Create/update admin attached to the chosen organization

## Staff management

**UI:** `/staff` in `AppShell` nav  
**Permissions:** flat — any admin in the org can manage staff

| Method | Path | Notes |
|--------|------|--------|
| GET | `/staff` | List admins in JWT org |
| POST | `/staff` | Create admin in JWT org |
| PATCH | `/staff/:id` | Update name/email (and optional password) within org |
| DELETE | `/staff/:id` | Delete within org |

**Rules:**

- Cannot delete yourself
- Cannot delete the last admin in the organization
- Cross-org IDs → `404`

## Landing page

**Path:** `/` (replace current auth redirect)  
**Visual direction:** Daylight Ops — bright canvas, blue accent aligned with admin tokens, crisp product feel  
**Structure:** Focused five sections

| Section | Purpose |
|---------|---------|
| Nav | LibraAI brand, Features, Pricing, Sign in, Get started → `/signup` (or Go to dashboard if token present) |
| Hero | Brand-forward headline: AI that runs your library desk; one supporting sentence; CTA group |
| AI | “Do everything with AI” + example prompts for books, members, loans |
| Platform | Books, Members, Loans — dashboard + AI |
| Pricing | Three plans → `/signup?plan=…` |
| Footer CTA | Create your library |

### Pricing (display only)

| Plan | Price | Marketing features |
|------|-------|--------------------|
| Starter | LKR 3,000/mo | 1 library, up to 2 staff, core books/members/loans, AI assistant |
| Pro | LKR 6,000/mo | Up to 10 staff, higher catalogue capacity messaging, priority AI usage (copy); highlighted as popular |
| Enterprise | LKR 9,000/mo | Unlimited staff messaging, dedicated support copy, full AI access |

No payment collection; choosing a plan only sets `organizations.plan` at signup.

### Motion & polish

- Subtle hero gradient atmosphere (not flat single color)
- 2–3 intentional motions (e.g. nav fade, pricing highlight, AI prompt stagger)
- Mobile-responsive; first viewport stays lean (brand, headline, support line, CTAs)

## Frontend routes

| Path | Auth | Notes |
|------|------|--------|
| `/` | Public | Landing; never auto-redirect away |
| `/signup` | Public | Self registration |
| `/login` | Public | Existing |
| `/staff` | Authenticated | New shell page |
| `/overview`, `/books`, `/members`, `/loans` | Authenticated | Existing; data now org-scoped via API |

`ChatWidget` remains on authenticated shell pages only (not landing/login/signup).

## Error handling

| Case | Response |
|------|----------|
| Validation | `400` |
| Bad credentials | `401` |
| Missing/invalid JWT | `401` |
| Duplicate admin email | `409` |
| Staff delete self / last admin | `400` |
| Resource outside org | `404` |

## Testing

- API: signup creates org + admin; login JWT includes `orgId`; books/members isolation between orgs; staff CRUD rules
- Seed: interactive path not unit-tested; document manual check
- Landing/signup/staff: manual FE verification against running API

## Components (frontend sketch)

- `LandingPage` sections as focused components under `apps/web/components/landing/` or equivalent
- `SignupForm` on `/signup`
- `Staff` page mirroring existing books/members table + modal patterns
- Reuse existing design tokens in `globals.css`; landing may add a small set of landing-only utilities without changing admin look
