import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit.js";

describe("createRateLimiter", () => {
  it("allows up to the limit per key, then returns seconds to wait", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.hit("a", 0)).toBeNull();
    expect(limiter.hit("a", 1_000)).toBeNull();
    expect(limiter.hit("a", 2_000)).toBe(58);
    expect(limiter.hit("b", 2_000)).toBeNull();
  });

  it("frees capacity once old hits leave the window", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000 });
    expect(limiter.hit("a", 0)).toBeNull();
    expect(limiter.hit("a", 5_000)).not.toBeNull();
    expect(limiter.hit("a", 10_001)).toBeNull();
  });
});
