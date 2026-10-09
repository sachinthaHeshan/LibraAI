# Overview Lending Activity Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the Overview “Lending activity” chart to real loan issue counts over a rolling last-12-months window.

**Architecture:** Keep aggregation in the web app. Add a pure `lendingActivitySeries` helper that buckets `issuedAt` into 12 trailing months, unit-test it, then wire Overview to fetch all loans (unfiltered) for the chart while keeping borrowed loans for rings/overdue. Extend `ActivityChart` to accept rolling month labels.

**Tech Stack:** Next.js App Router (`apps/web`), React 19, existing `apiFetch`, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-overview-lending-activity-design.md`
- Metric: loans **issued** per month (`issuedAt`), not active balance or returns
- Window: rolling last 12 months ending current local calendar month
- Empty months = `0`; empty window = flat zeros
- No new API endpoint or schema changes
- No chart library swap / visual redesign beyond labels + copy
- Subtitle: “Last 12 months”; legend: “Loans issued”

---

## File Structure

```
apps/web/
├── lib/
│   ├── lending-activity.ts       # pure series helper
│   └── lending-activity.test.ts  # unit tests
└── app/overview/
    └── page.tsx                  # fetch, chart wire-up, copy
```

---

### Task 1: `lendingActivitySeries` helper + tests

**Files:**
- Create: `apps/web/lib/lending-activity.ts`
- Create: `apps/web/lib/lending-activity.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `export type LoanIssuedAt = { issuedAt: string }`
  - `export type LendingActivitySeries = { points: number[]; labels: string[] }`
  - `export function lendingActivitySeries(loans: LoanIssuedAt[], now?: Date): LendingActivitySeries`
  - Always returns `points.length === 12` and `labels.length === 12`
  - Invalid/missing `issuedAt` skipped (no throw)

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/lending-activity.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { lendingActivitySeries } from "./lending-activity";

describe("lendingActivitySeries", () => {
  const now = new Date(2026, 7, 15); // Aug 15, 2026 local

  it("buckets two loans in the same month", () => {
    const series = lendingActivitySeries(
      [
        { issuedAt: new Date(2026, 7, 1).toISOString() },
        { issuedAt: new Date(2026, 7, 20).toISOString() },
      ],
      now,
    );
    expect(series.points).toHaveLength(12);
    expect(series.points[11]).toBe(2);
    expect(series.points.slice(0, 11).every((n) => n === 0)).toBe(true);
  });

  it("ignores loans outside the trailing window", () => {
    const series = lendingActivitySeries(
      [
        { issuedAt: new Date(2025, 6, 1).toISOString() }, // Jul 2025 — before Sep 2025 start
        { issuedAt: new Date(2025, 8, 1).toISOString() }, // Sep 2025 — first slot
      ],
      now,
    );
    expect(series.points[0]).toBe(1);
    expect(series.points.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("fills empty months with zero", () => {
    const series = lendingActivitySeries([], now);
    expect(series.points).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("rolls labels for a fixed now (Aug 2026 → Sep…Aug)", () => {
    const series = lendingActivitySeries([], now);
    expect(series.labels).toEqual([
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
    ]);
  });

  it("skips invalid issuedAt without throwing", () => {
    expect(() =>
      lendingActivitySeries([{ issuedAt: "not-a-date" }, { issuedAt: "" }], now),
    ).not.toThrow();
    expect(lendingActivitySeries([{ issuedAt: "not-a-date" }], now).points.every((n) => n === 0)).toBe(
      true,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @libra/web test lib/lending-activity.test.ts`

Expected: FAIL (module not found or `lendingActivitySeries` undefined)

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/lib/lending-activity.ts`:

```ts
export type LoanIssuedAt = { issuedAt: string };

export type LendingActivitySeries = {
  points: number[];
  labels: string[];
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${monthIndex}`;
}

export function lendingActivitySeries(
  loans: LoanIssuedAt[],
  now: Date = new Date(),
): LendingActivitySeries {
  const endYear = now.getFullYear();
  const endMonth = now.getMonth(); // 0-11

  const keys: string[] = [];
  const labels: string[] = [];
  const counts = new Map<string, number>();

  for (let i = 0; i < 12; i += 1) {
    const offset = 11 - i;
    const date = new Date(endYear, endMonth - offset, 1);
    const key = monthKey(date.getFullYear(), date.getMonth());
    keys.push(key);
    labels.push(MONTH_LABELS[date.getMonth()]!);
    counts.set(key, 0);
  }

  for (const loan of loans) {
    const issued = new Date(loan.issuedAt);
    if (Number.isNaN(issued.getTime())) {
      continue;
    }
    const key = monthKey(issued.getFullYear(), issued.getMonth());
    if (!counts.has(key)) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    points: keys.map((key) => counts.get(key) ?? 0),
    labels,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @libra/web test lib/lending-activity.test.ts`

Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/lending-activity.ts apps/web/lib/lending-activity.test.ts
git commit -m "$(cat <<'EOF'
feat(web): add lending activity series helper

EOF
)"
```

---

### Task 2: Wire Overview chart to real loan data

**Files:**
- Modify: `apps/web/app/overview/page.tsx`

**Interfaces:**
- Consumes: `lendingActivitySeries` from `@/lib/lending-activity`
- Produces: Overview UI with real chart series; no exported API

- [ ] **Step 1: Extend loan type and load all loans for the chart**

In `apps/web/app/overview/page.tsx`:

1. Import helper:

```ts
import { lendingActivitySeries } from "@/lib/lending-activity";
```

2. Extend `Loan` (or add a chart loan type) so it includes `issuedAt`:

```ts
type Loan = {
  id: string;
  dueDate: string;
  overdue: boolean;
  issuedAt: string;
  book: { title: string };
  member: { name: string };
};

type ActivityLoan = {
  issuedAt: string;
};
```

3. Add state for activity loans:

```ts
const [activityLoans, setActivityLoans] = useState<ActivityLoan[]>([]);
```

4. In `load`, fetch unfiltered loans in parallel with existing calls:

```ts
const [nextBooks, nextMembers, nextLoans, nextActivityLoans] = await Promise.all([
  apiFetch<Book[]>("/books"),
  apiFetch<Member[]>("/members"),
  apiFetch<Loan[]>("/loans?status=borrowed"),
  apiFetch<ActivityLoan[]>("/loans"),
]);
setBooks(nextBooks);
setMembers(nextMembers);
setLoans(nextLoans);
setActivityLoans(nextActivityLoans);
```

On catch, also `setActivityLoans([])`.

- [ ] **Step 2: Replace synthetic chartPoints and update ActivityChart**

1. Replace the synthetic `chartPoints` `useMemo` with:

```ts
const activity = useMemo(() => lendingActivitySeries(activityLoans), [activityLoans]);
```

2. Change `ActivityChart` props from `{ points: number[] }` to `{ points: number[]; labels: string[] }`.

3. Remove the hardcoded months array inside `ActivityChart`. Render labels from props:

```tsx
function ActivityChart({ points, labels }: { points: number[]; labels: string[] }) {
  // ... existing width/height/coords/line logic unchanged ...

  return (
    <div className="overflow-x-auto">
      <svg className="min-w-full" height={height + 28} viewBox={`0 0 ${width} ${height + 28}`} width="100%">
        {/* grid lines, path, fill, circles — unchanged */}
        {labels.map((label, index) => (
          <text
            fill="#9ca3af"
            fontSize="11"
            key={`${label}-${index}`}
            textAnchor="middle"
            x={coords[index]?.x}
            y={height + 18}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
```

4. Call site:

```tsx
<ActivityChart labels={activity.labels} points={activity.points} />
```

- [ ] **Step 3: Update copy**

- `AppShell` `subtitle`: `"This year"` → `"Last 12 months"`
- Legend: `"Active loans trend"` → `"Loans issued"`
- Keep the “N currently out” span as-is

- [ ] **Step 4: Run helper tests again (smoke)**

Run: `pnpm --filter @libra/web test lib/lending-activity.test.ts`

Expected: PASS

- [ ] **Step 5: Manual sanity check**

With API + web running and seeded data:

1. Open `/overview`
2. Confirm x-axis is rolling months (not fixed Jan–Dec starting at Jan unless today is Dec)
3. Confirm points match loans issued in those months (borrowed + returned)
4. Confirm subtitle “Last 12 months” and legend “Loans issued”

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/overview/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): bind overview lending chart to issued loans

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Issued-per-month metric | Task 1 |
| Rolling last 12 months | Task 1 |
| Empty months = 0 | Task 1 |
| Client aggregate from `GET /loans` | Task 2 |
| Keep borrowed fetch for rings / currently out | Task 2 |
| ActivityChart accepts labels | Task 2 |
| Subtitle + legend copy | Task 2 |
| Skip invalid `issuedAt` | Task 1 |
| Unit tests for helper | Task 1 |
| No new API | (none) |
