# Overview Ring Polish Implementation Plan

> **For agentic workers:** Implement task-by-task. Spec: `docs/superpowers/specs/2026-08-10-overview-ring-polish-design.md`.

**Goal:** Light polish on Overview donut rings — thinner ring, tabular %, fill animation, empty states.

**Architecture:** Keep CSS conic rings; register `--value` with `@property` so it can transition; React mounts at 0 then sets target with stagger delay.

**Tech stack:** Next.js client component, existing Tailwind + `globals.css` tokens.

## File map

| File | Role |
|------|------|
| `apps/web/app/globals.css` | Ring size, hole, `@property`, transition, reduced-motion |
| `apps/web/app/overview/page.tsx` | `Ring` animation mount + empty props |

## Task 1: CSS ring polish

Update `.ring` size to 8.5rem, white hole ~78%, add `@property --value`, transition `--value` 600ms ease-out. Disable transition under `prefers-reduced-motion`.

## Task 2: Ring component + empty wiring

- Animate: start `--value` at 0, after mount (rAF + optional delay) set to target
- Empty: show `—`, force progress 0, muted compare
- Wire three rings with empty flags and delays 0 / 80 / 160

## Task 3: Verify

Load Overview with seeded data and with empty org; confirm motion + empty copy; check reduced-motion if easy.
