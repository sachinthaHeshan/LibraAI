# API Health Check — Design Spec

**Date:** 2026-08-09  
**Status:** Approved

## Summary

Add a public liveness endpoint so operators and load balancers can confirm the API process is running.

## Goals

- Expose `GET /health` that returns success when the Fastify process is up
- Keep the check free of database or dependency probes

## Non-goals

- Readiness / database ping
- Separate `/ready` endpoint
- Process metrics or under-pressure integration

## Behavior

| Item | Choice |
|------|--------|
| Method / path | `GET /health` |
| Auth | Public (no JWT) |
| Success | `200` + `{ "status": "ok" }` |
| Dependencies | None |

## Structure

- New route module `apps/api/src/routes/health.ts`
- Register in `apps/api/src/app.ts` alongside existing routes
- Vitest coverage: one inject test asserting status and body
