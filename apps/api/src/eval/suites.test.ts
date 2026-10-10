import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  runEntitySuite,
  runProtocolSuite,
  runRoutingSuite,
  runSafetySuite,
  runSearchSuite,
  type SearchFixture,
} from "./suites.js";

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", `${name}.v1.json`), "utf8")) as T;
}

describe("evaluation suites on the versioned fixtures", () => {
  const search = fixture<SearchFixture>("search");
  const suites = [
    runEntitySuite(fixture("entities")),
    runSearchSuite(search),
    runRoutingSuite(fixture("routing")),
    runSafetySuite(fixture("safety")),
    runProtocolSuite(fixture("routing"), fixture("safety")),
  ];

  it("produces every suite with metrics in [0, 1]", () => {
    expect(suites.map((suite) => suite.suite)).toEqual(["entities", "search", "routing", "safety", "protocol"]);
    for (const suite of suites) {
      expect(suite.cases.length).toBeGreaterThan(0);
      for (const value of Object.values(suite.metrics)) {
        if (value !== null) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("reports Recall@K for every configured k plus MRR", () => {
    expect(Object.keys(suites[1].metrics)).toEqual([...search.ks.map((k) => `recall@${k}`), "mrr"]);
  });

  it("is deterministic apart from latency", () => {
    const strip = (value: unknown) =>
      JSON.parse(JSON.stringify(value, (key, field) => (key === "latencyMs" ? undefined : field)));
    expect(strip(runSearchSuite(search))).toEqual(strip(suites[1]));
  });

  it("rejects search fixtures that reference unknown books", () => {
    expect(() =>
      runSearchSuite({
        ks: [1],
        catalog: {},
        cases: [{ id: "x", query: "q", keywordHits: [["missing", 1]], vectorHits: [], relevant: [] }],
      }),
    ).toThrow(/unknown book "missing"/);
  });
});
