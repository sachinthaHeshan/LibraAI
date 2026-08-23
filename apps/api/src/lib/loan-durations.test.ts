import { describe, expect, it } from "vitest";
import { dueDateFor } from "./loan-durations.js";

describe("dueDateFor", () => {
  const from = new Date("2026-10-07T12:00:00.000Z");

  it("adds 7, 14, or 30 days for each duration", () => {
    expect(dueDateFor("1 week", from)).toBe("2026-10-14");
    expect(dueDateFor("2 weeks", from)).toBe("2026-10-21");
    expect(dueDateFor("1 month", from)).toBe("2026-11-06");
  });

  it("rolls over the year end", () => {
    expect(dueDateFor("2 weeks", new Date("2026-12-25T00:00:00.000Z"))).toBe("2027-01-08");
  });
});
