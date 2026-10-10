import { describe, expect, it } from "vitest";
import { PLANS, parsePlanId } from "./plans";

describe("plans", () => {
  it("includes three LKR prices", () => {
    expect(PLANS.map((p) => p.priceLkr)).toEqual([3000, 6000, 9000]);
  });

  it("defaults invalid plan to pro", () => {
    expect(parsePlanId(null)).toBe("pro");
    expect(parsePlanId("nope")).toBe("pro");
    expect(parsePlanId("starter")).toBe("starter");
  });
});
