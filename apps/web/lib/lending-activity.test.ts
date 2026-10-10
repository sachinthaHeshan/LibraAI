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
