import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SuiteResult } from "./suites.js";

export type FixtureInfo = {
  name: string;
  path: string;
  version: number;
  sha256: string;
  cases: number;
};

export type EvalManifest = {
  generatedAt: string;
  gitRevision: string | null;
  gitDirty: boolean | null;
  mode: "deterministic";
  protocolVersion: string;
  nodeVersion: string;
  fixtures: FixtureInfo[];
};

export type EvalResults = {
  suites: SuiteResult[];
};

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function formatMetric(value: number | null): string {
  return value === null ? "n/a" : value.toFixed(3);
}

function percentile(sorted: number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

/** p50/p95/max latency in ms over cases that reported one. Null when none did. */
export function latencySummary(
  suite: SuiteResult,
): { p50: number; p95: number; max: number } | null {
  const values = suite.cases
    .map((item) => item.latencyMs)
    .filter((value): value is number => typeof value === "number")
    .sort((left, right) => left - right);
  if (values.length === 0) return null;
  return { p50: percentile(values, 50), p95: percentile(values, 95), max: values[values.length - 1] };
}

function cell(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function buildReport(manifest: EvalManifest, results: EvalResults): string {
  const lines: string[] = [
    "# LibraAI evaluation report",
    "",
    `- Generated: ${manifest.generatedAt}`,
    `- Git revision: \`${manifest.gitRevision ?? "unknown"}\`${manifest.gitDirty ? " (uncommitted changes)" : ""}`,
    `- Mode: ${manifest.mode}`,
    `- Protocol version: ${manifest.protocolVersion}`,
    "",
    "## Fixtures",
    "",
    "| Fixture | Version | Cases | SHA-256 |",
    "| --- | --- | --- | --- |",
    ...manifest.fixtures.map(
      (fixture) =>
        `| ${fixture.name} | ${fixture.version} | ${fixture.cases} | \`${fixture.sha256.slice(0, 12)}\` |`,
    ),
    "",
    "## Summary",
    "",
    "| Suite | Metric | Value | Passed | Latency p50 / p95 (ms) |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const suite of results.suites) {
    const passed = suite.cases.filter((item) => item.passed).length;
    const latency = latencySummary(suite);
    const latencyText = latency ? `${latency.p50.toFixed(3)} / ${latency.p95.toFixed(3)}` : "n/a";
    Object.entries(suite.metrics).forEach(([metric, value], index) => {
      lines.push(
        index === 0
          ? `| ${suite.suite} | ${metric} | ${formatMetric(value)} | ${passed}/${suite.cases.length} | ${latencyText} |`
          : `| | ${metric} | ${formatMetric(value)} | | |`,
      );
    });
  }

  lines.push("", "## Failed cases", "");
  const failedSuites = results.suites.filter((suite) => suite.cases.some((item) => !item.passed));
  if (failedSuites.length === 0) {
    lines.push("None.");
  }
  for (const suite of failedSuites) {
    lines.push(
      `### ${suite.suite}`,
      "",
      "| Case | Input | Expected | Actual |",
      "| --- | --- | --- | --- |",
      ...suite.cases
        .filter((item) => !item.passed)
        .map(
          (item) =>
            `| ${item.id} | ${cell(item.input)} | ${cell(item.expected)} | ${cell(item.actual)} |`,
        ),
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function writeEvalOutputs(
  outDir: string,
  manifest: EvalManifest,
  results: EvalResults,
): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const files = {
    "manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "results.json": `${JSON.stringify(results, null, 2)}\n`,
    "report.md": buildReport(manifest, results),
  };
  const written: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    const path = join(outDir, name);
    await writeFile(path, content, "utf8");
    written.push(path);
  }
  return written;
}
