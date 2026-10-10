/**
 * In-memory sliding-window limiter. Each API process keeps its own counts, which is
 * enough to stop one user from flooding the LLM; it is not a shared quota across replicas.
 */
export type RateLimiter = {
  /** Records a hit for `key`. Returns seconds to wait when over the limit, otherwise null. */
  hit(key: string, now?: number): number | null;
  reset(): void;
};

export function createRateLimiter(options: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    hit(key, now = Date.now()) {
      const windowStart = now - options.windowMs;
      const recent = (hits.get(key) ?? []).filter((time) => time > windowStart);
      if (recent.length >= options.limit) {
        hits.set(key, recent);
        return Math.max(1, Math.ceil((recent[0]! + options.windowMs - now) / 1000));
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 10_000) {
        for (const [staleKey, times] of hits) {
          if (times.every((time) => time <= windowStart)) hits.delete(staleKey);
        }
      }
      return null;
    },
    reset() {
      hits.clear();
    },
  };
}
