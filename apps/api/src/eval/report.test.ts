import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildReport,
  formatMetric,
  latencySummary,
  sha256,
  writeEvalOutputs,
  type EvalManifest,
  type EvalResults,
} from "./report.js";

const manifest: EvalManifest = {
  generatedAt: "2026-10-09T00:00:00.000Z",
  gitRevision: "abc123",
  gitDirty: true,
  mode: "deterministic",
  protocolVersion: "2026-10-01",
  nodeVersion: "v22.0.0",
  fixtures: [
    { name: "routing", path: "src/eval/fixtures/routing.v1.json", version: 1, sha256: "f".repeat(64), cases: 2 },
  ],
};

const results: EvalResults = {
  suites: [
    {
      suite: "routing",
      metrics: { accuracy: 0.5 },
      cases: [
        { id: "ok", input: "find dune", expected: "search-agent", actual: "search-agent", passed: true, latencyMs: 1 },
        { id: "bad", input: "a | b", expected: "borrow-agent", actual: "search-agent", passed: false, latencyMs: 3 },
      ],
    },
    {
      suite: "safety",
      metrics: { precision: null, recall: 1 },
      cases: [{ id: "s1", input: "hi", expected: "allow", actual: "allow", passed: true }],
    },
  ],
};

describe("report helpers", () => {
  it("hashes content with SHA-256", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("formats metrics and n/a", () => {
    expect(formatMetric(2 / 3)).toBe("0.667");
    expect(formatMetric(null)).toBe("n/a");
  });

  it("summarizes latency and skips cases without timing", () => {
    expect(latencySummary(results.suites[0])).toEqual({ p50: 1, p95: 3, max: 3 });
    expect(latencySummary(results.suites[1])).toBeNull();
  });
});

describe("buildReport", () => {
  const report = buildReport(manifest, results);

  it("is traceable to the revision and fixture hashes", () => {
    expect(report).toContain("Git revision: `abc123` (uncommitted changes)");
    expect(report).toContain("| routing | 1 | 2 | `ffffffffffff` |");
  });

  it("summarizes metrics, pass counts and latency", () => {
    expect(report).toContain("| routing | accuracy | 0.500 | 1/2 | 1.000 / 3.000 |");
    expect(report).toContain("| safety | precision | n/a | 1/1 | n/a |");
    expect(report).toContain("| | recall | 1.000 | | |");
  });

  it("lists only failed cases, escaping table pipes", () => {
    expect(report).toContain("### routing");
    expect(report).toContain("| bad | a \\| b | borrow-agent | search-agent |");
    expect(report).not.toContain("| ok |");
    expect(report).not.toContain("### safety");
  });

  it("says None when every case passed", () => {
    const allPassed = buildReport(manifest, { suites: [results.suites[1]] });
    expect(allPassed).toMatch(/## Failed cases\n\nNone\.\n$/);
  });

  it("is deterministic for the same inputs", () => {
    expect(buildReport(manifest, results)).toBe(report);
  });
});

describe("writeEvalOutputs", () => {
  let dir: string | undefined;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("writes manifest.json, results.json and report.md", async () => {
    dir = await mkdtemp(join(tmpdir(), "libra-eval-"));
    const out = join(dir, "nested");
    const written = await writeEvalOutputs(out, manifest, results);

    expect(written.map((path) => path.slice(out.length + 1))).toEqual([
      "manifest.json",
      "results.json",
      "report.md",
    ]);
    expect(JSON.parse(await readFile(join(out, "manifest.json"), "utf8"))).toEqual(manifest);
    expect(JSON.parse(await readFile(join(out, "results.json"), "utf8"))).toEqual(results);
    expect(await readFile(join(out, "report.md"), "utf8")).toBe(buildReport(manifest, results));
  });
});
