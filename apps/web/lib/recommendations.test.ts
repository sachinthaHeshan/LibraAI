import { describe, expect, it, vi } from "vitest";

import { fetchRecommendations, nextPicksLabel } from "./recommendations";

describe("fetchRecommendations", () => {
  it("loads the member's recommendations", async () => {
    const data = { generatedAt: "x", nextRefreshAt: "y", summary: null, books: [] };
    const fetchJson = vi.fn().mockResolvedValue(data);
    await expect(fetchRecommendations(fetchJson)).resolves.toBe(data);
    expect(fetchJson).toHaveBeenCalledWith("/recommendations");
  });
});

describe("nextPicksLabel", () => {
  const now = new Date("2026-10-07T12:00:00.000Z").getTime();

  it("counts whole days until the refresh", () => {
    expect(nextPicksLabel("2026-10-10T09:00:00.000Z", now)).toBe("New picks in 3 days");
    expect(nextPicksLabel("2026-10-08T09:00:00.000Z", now)).toBe("New picks tomorrow");
    expect(nextPicksLabel("2026-10-07T09:00:00.000Z", now)).toBe("New picks on your next visit");
  });
});
