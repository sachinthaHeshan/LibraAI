# Overview Lending Activity Graph — Design Spec

**Date:** 2026-08-10  
**Status:** Approved for planning

## Summary

Bind the Overview page “Lending activity” chart to real loan data: count of loans issued per month over a rolling last-12-months window, replacing the current synthetic series derived from active loan count.

## Goals

- Chart points reflect actual checkouts (`issuedAt`), not fabricated values
- Rolling trailing 12 months ending with the current month
- Empty months show `0`; empty window shows a flat zero series
- Keep existing chart visuals; only wire real data and honest labels

## Non-goals

- New stats/analytics API endpoint
- Multiple series (returns, overdue, active balance) on the chart
- Calendar-year Jan–Dec fixed axis
- Chart library swap or visual redesign
- Changing ring metrics or catalogue attention table behavior

## Architecture approach

**Client aggregation from existing `GET /loans`.**

```
Overview load:
  GET /books
  GET /members
  GET /loans?status=borrowed   → rings, overdue, “currently out”
  GET /loans                  → all statuses for chart series

lendingActivitySeries(loans, now) → { points: number[12], labels: string[12] }
ActivityChart({ points, labels })
```

No API or schema changes. Aggregation stays in the web app until volume or more dashboards justify a dedicated stats route.

## Data model / series rules

Source field: `loan.issuedAt` (ISO timestamp from API).

Window: 12 consecutive months ending at the calendar month of `now` (local time).

For each month slot `i` in `0..11`:

- Month key = month of `(now − (11 − i) months)` (year/month only)
- `points[i]` = count of loans whose `issuedAt` year/month equals that key
- `labels[i]` = short English month abbreviation (`Jan` … `Dec`)

Loans outside the window are ignored. Returned and borrowed loans both count (issue event, not return).

## UI changes

| Location | Change |
|----------|--------|
| `AppShell` subtitle on Overview | “This year” → “Last 12 months” |
| Legend text | “Active loans trend” → “Loans issued” |
| “N currently out” | Unchanged (still from borrowed/on-loan stock) |
| `ActivityChart` | Accept `labels` alongside `points`; stop hardcoding Jan–Dec |

Loading skeleton and failure behavior stay as today: failed fetch clears lists → zero chart series.

## Components

### `lendingActivitySeries(loans, now?)`

Pure helper (web `lib/` or colocated module):

- Input: `{ issuedAt: string }[]`, optional `Date` for testability
- Output: `{ points: number[], labels: string[] }` both length 12

### `ActivityChart`

- Props: `points: number[]`, `labels: string[]`
- Existing SVG path/area/dots unchanged; x-axis text from `labels`

### Overview page

- Parallel fetch of unfiltered `/loans` for activity (or reuse one unfiltered fetch and derive borrowed subset for rings — either is fine if rings stay correct)
- Replace synthetic `chartPoints` `useMemo` with helper output

## Error handling

- Chart source fetch fails with other overview loads: empty arrays → zero series; page still renders
- Invalid/missing `issuedAt`: skip that loan in the series (do not throw)

## Testing

Unit tests for `lendingActivitySeries`:

1. Buckets two loans in the same month correctly
2. Ignores loans outside the trailing window
3. Fills empty months with `0`
4. Labels roll correctly for a fixed `now` (e.g. Aug 2026 → Sep…Aug)

No new API tests.

## Delivery order

1. Add helper + unit tests
2. Wire Overview fetches and chart/legend/subtitle
3. Manual check against seeded loans spanning multiple months
