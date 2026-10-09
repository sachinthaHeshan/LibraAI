/**
 * Deterministic, API-key-free evaluation: entity extraction, search relevance,
 * agent routing, safety refusals and protocol metadata.
 *
 *   pnpm --filter @libra/api eval [--out <dir>]
 *
 * Writes manifest.json, results.json and report.md (default: apps/api/eval-results/latest).
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EVAL_PROTOCOL_VERSION } from "./baselines.js";
import { writeEvalOutputs, sha256, type EvalManifest, type FixtureInfo } from "./report.js";
import {
  runEntitySuite,
  runProtocolSuite,
  runRoutingSuite,
  runSafetySuite,
  runSearchSuite,
  type EntityFixture,
  type RoutingFixture,
  type SafetyFixture,
  type SearchFixture,
} from "./suites.js";

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(here, "../..");

async function loadFixture<T extends { version: number; cases: unknown[] }>(
  name: string,
): Promise<{ data: T; info: FixtureInfo }> {
  const path = join(here, "fixtures", `${name}.v1.json`);
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw) as T;
  return {
    data,
    info: {
      name,
      path: relative(apiRoot, path),
      version: data.version,
      sha256: sha256(raw),
      cases: data.cases.length,
    },
  };
}

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: apiRoot, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function outDirFromArgs(argv: string[]): string {
  const index = argv.indexOf("--out");
  const value = index === -1 ? undefined : argv[index + 1];
  return value ? resolve(process.cwd(), value) : join(apiRoot, "eval-results", "latest");
}

async function main() {
  const entities = await loadFixture<EntityFixture & { version: number }>("entities");
  const search = await loadFixture<SearchFixture & { version: number }>("search");
  const routing = await loadFixture<RoutingFixture & { version: number }>("routing");
  const safety = await loadFixture<SafetyFixture & { version: number }>("safety");

  const status = git(["status", "--porcelain"]);
  const manifest: EvalManifest = {
    generatedAt: new Date().toISOString(),
    gitRevision: git(["rev-parse", "HEAD"]),
    gitDirty: status === null ? null : status.length > 0,
    mode: "deterministic",
    protocolVersion: EVAL_PROTOCOL_VERSION,
    nodeVersion: process.version,
    fixtures: [entities.info, search.info, routing.info, safety.info],
  };

  const results = {
    suites: [
      runEntitySuite(entities.data),
      runSearchSuite(search.data),
      runRoutingSuite(routing.data),
      runSafetySuite(safety.data),
      runProtocolSuite(routing.data, safety.data),
    ],
  };

  const written = await writeEvalOutputs(outDirFromArgs(process.argv.slice(2)), manifest, results);
  for (const suite of results.suites) {
    const metrics = Object.entries(suite.metrics)
      .map(([name, value]) => `${name}=${value === null ? "n/a" : value.toFixed(3)}`)
      .join(" ");
    const passed = suite.cases.filter((item) => item.passed).length;
    console.log(`${suite.suite.padEnd(9)} ${passed}/${suite.cases.length} passed  ${metrics}`);
  }
  console.log(`\nWrote:\n${written.map((path) => `  ${path}`).join("\n")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
