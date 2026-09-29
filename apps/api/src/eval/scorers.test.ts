import { describe, expect, it } from "vitest";
import {
  fieldAccuracy,
  fieldsMatch,
  mean,
  missingFields,
  protocolMetrics,
  ratio,
  recallAtK,
  reciprocalRank,
  refusalMetrics,
  retrievalMetrics,
  routingMetrics,
} from "./scorers.js";

describe("ratio and mean", () => {
  it("returns null for an empty denominator", () => {
    expect(ratio(0, 0)).toBeNull();
    expect(mean([])).toBeNull();
  });

  it("divides normally otherwise", () => {
    expect(ratio(1, 4)).toBe(0.25);
    expect(mean([1, 0, 0.5])).toBe(0.5);
  });
});

describe("fieldAccuracy", () => {
  it("compares strings case-insensitively and treats null/undefined/empty as equal", () => {
    expect(fieldsMatch("The Hobbit", " the hobbit ")).toBe(true);
    expect(fieldsMatch(null, undefined)).toBe(true);
    expect(fieldsMatch(null, "")).toBe(true);
    expect(fieldsMatch("Dune", null)).toBe(false);
  });

  it("compares arrays as sets", () => {
    expect(fieldsMatch(["b", "A"], ["a", "B", "a"])).toBe(true);
    expect(fieldsMatch(["a"], ["a", "b"])).toBe(false);
  });

  it("computes overall, exact-match and per-field accuracy", () => {
    const result = fieldAccuracy([
      { expected: { title: "Dune", author: "Frank Herbert" }, actual: { title: "dune", author: "Frank Herbert" } },
      { expected: { title: "Emma", author: null }, actual: { title: "Emma", author: "Jane Austen" } },
      { expected: { title: null, author: "Asimov" }, actual: { title: "Foundation", author: "Clarke" } },
    ]);
    // 6 fields: 2 + 1 + 0 correct
    expect(result.overall).toBe(3 / 6);
    expect(result.exactMatchRate).toBe(1 / 3);
    expect(result.perField).toEqual({ title: 2 / 3, author: 1 / 3 });
  });

  it("treats a field missing from the actual output as null", () => {
    expect(fieldAccuracy([{ expected: { genre: null }, actual: {} }]).overall).toBe(1);
  });

  it("is null for no cases", () => {
    expect(fieldAccuracy([])).toEqual({ overall: null, exactMatchRate: null, perField: {} });
  });
});

describe("recallAtK", () => {
  const ranked = ["a", "x", "b", "y", "c"];

  it("counts relevant ids within the cutoff", () => {
    expect(recallAtK(["a", "b", "c"], ranked, 1)).toBe(1 / 3);
    expect(recallAtK(["a", "b", "c"], ranked, 3)).toBe(2 / 3);
    expect(recallAtK(["a", "b", "c"], ranked, 5)).toBe(1);
    expect(recallAtK(["a", "b", "c"], ranked, 50)).toBe(1);
  });

  it("ignores duplicates in ranked and relevant lists", () => {
    expect(recallAtK(["a", "a", "b"], ["a", "a", "a"], 3)).toBe(1 / 2);
  });

  it("is null when nothing is relevant and rejects k < 1", () => {
    expect(recallAtK([], ranked, 3)).toBeNull();
    expect(() => recallAtK(["a"], ranked, 0)).toThrow(RangeError);
  });
});

describe("reciprocalRank and MRR", () => {
  it("uses the first relevant hit", () => {
    expect(reciprocalRank(["b", "a"], ["x", "a", "b"])).toBe(1 / 2);
    expect(reciprocalRank(["a"], ["a"])).toBe(1);
    expect(reciprocalRank(["a"], ["x", "y"])).toBe(0);
    expect(reciprocalRank([], ["a"])).toBeNull();
  });

  it("averages over cases that have relevant ids", () => {
    const metrics = retrievalMetrics(
      [
        { relevant: ["a"], ranked: ["a", "b"] }, // RR 1, R@1 1
        { relevant: ["b"], ranked: ["a", "x", "b"] }, // RR 1/3, R@1 0, R@3 1
        { relevant: ["c"], ranked: [] }, // RR 0
        { relevant: [], ranked: ["z"] }, // skipped
      ],
      [1, 3],
    );
    expect(metrics.scoredCases).toBe(3);
    expect(metrics.mrr).toBeCloseTo((1 + 1 / 3 + 0) / 3);
    expect(metrics.recallAtK).toEqual({ "@1": 1 / 3, "@3": 2 / 3 });
  });
});

describe("routingMetrics", () => {
  it("computes accuracy and a confusion matrix", () => {
    const result = routingMetrics([
      { expected: "search", predicted: "search" },
      { expected: "search", predicted: "borrow" },
      { expected: "borrow", predicted: "borrow" },
      { expected: "recommend", predicted: "search" },
    ]);
    expect(result.accuracy).toBe(0.5);
    expect(result.confusion).toEqual({
      search: { search: 1, borrow: 1 },
      borrow: { borrow: 1 },
      recommend: { search: 1 },
    });
  });

  it("is null with no cases", () => {
    expect(routingMetrics([]).accuracy).toBeNull();
  });
});

describe("refusalMetrics", () => {
  it("computes precision, recall and F1 with refusal as the positive class", () => {
    const result = refusalMetrics([
      { shouldRefuse: true, refused: true }, // TP
      { shouldRefuse: true, refused: true }, // TP
      { shouldRefuse: true, refused: false }, // FN
      { shouldRefuse: false, refused: true }, // FP
      { shouldRefuse: false, refused: false }, // TN
    ]);
    expect(result).toMatchObject({ truePositives: 2, falsePositives: 1, falseNegatives: 1, trueNegatives: 1 });
    expect(result.precision).toBe(2 / 3);
    expect(result.recall).toBe(2 / 3);
    expect(result.f1).toBeCloseTo(2 / 3);
  });

  it("reports undefined precision when nothing was refused", () => {
    const result = refusalMetrics([{ shouldRefuse: true, refused: false }]);
    expect(result.precision).toBeNull();
    expect(result.recall).toBe(0);
    expect(result.f1).toBeNull();
  });

  it("returns F1 of 0 when precision and recall are both 0", () => {
    const result = refusalMetrics([
      { shouldRefuse: true, refused: false },
      { shouldRefuse: false, refused: true },
    ]);
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
    expect(result.f1).toBe(0);
  });
});

describe("protocol completeness", () => {
  it("finds missing dot-paths, treating empty arrays as present", () => {
    const record = { protocolVersion: "1", toolIds: [], refusal: { code: "" }, timing: { totalMs: 0 } };
    expect(missingFields(record, ["protocolVersion", "toolIds", "refusal.code", "timing.totalMs", "agentId"])).toEqual([
      "refusal.code",
      "agentId",
    ]);
  });

  it("averages per-response completeness", () => {
    const result = protocolMetrics([
      { metadata: { a: 1, b: 2 }, required: ["a", "b"] },
      { metadata: { a: 1 }, required: ["a", "b", "c", "d"] },
      { metadata: {}, required: [] },
    ]);
    expect(result.completeness).toBeCloseTo((1 + 0.25 + 1) / 3);
    expect(result.fullyCompleteRate).toBe(2 / 3);
    expect(result.missingByField).toEqual({ b: 1, c: 1, d: 1 });
  });
});
