import { fuseSearchHits, type RankableHit } from "../mastra/search-rank.js";
import {
  extractCatalogEntities,
  requiredMetadataFields,
  respond,
  checkRequestPolicy,
  routeMessage,
} from "./baselines.js";
import {
  fieldAccuracy,
  fieldsMatch,
  missingFields,
  protocolMetrics,
  recallAtK,
  reciprocalRank,
  refusalMetrics,
  retrievalMetrics,
  routingMetrics,
  type FieldValue,
} from "./scorers.js";
import { ORCHESTRATOR_AGENT_ID } from "../mastra/constants.js";

export type CaseResult = {
  id: string;
  passed: boolean;
  input: string;
  expected: unknown;
  actual: unknown;
  latencyMs?: number;
};

export type SuiteResult = {
  suite: string;
  /** Headline numbers shown in the report summary. */
  metrics: Record<string, number | null>;
  /** Extra structured output (confusion matrix, per-field accuracy, …). */
  details?: Record<string, unknown>;
  cases: CaseResult[];
};

export type EntityFixture = {
  cases: { id: string; input: string; expected: Record<string, FieldValue> }[];
};

export type SearchFixture = {
  ks: number[];
  catalog: Record<string, { title: string; author: string; isbn: string; genre: string }>;
  cases: {
    id: string;
    query: string;
    keywordHits: [string, number][];
    vectorHits: [string, number][];
    relevant: string[];
  }[];
};

export type RoutingFixture = {
  cases: { id: string; input: string; expected: string }[];
};

export type SafetyFixture = {
  cases: { id: string; input: string; shouldRefuse: boolean; expectedCode?: string }[];
};

function timed<T>(run: () => T): { value: T; latencyMs: number } {
  const started = performance.now();
  const value = run();
  return { value, latencyMs: performance.now() - started };
}

export function runEntitySuite(fixture: EntityFixture): SuiteResult {
  const rows = fixture.cases.map((item) => {
    const { value, latencyMs } = timed(() => extractCatalogEntities(item.input));
    return { item, actual: value as Record<string, FieldValue>, latencyMs };
  });
  const accuracy = fieldAccuracy(rows.map(({ item, actual }) => ({ expected: item.expected, actual })));
  return {
    suite: "entities",
    metrics: { fieldAccuracy: accuracy.overall, exactMatchRate: accuracy.exactMatchRate },
    details: { perField: accuracy.perField },
    cases: rows.map(({ item, actual, latencyMs }) => ({
      id: item.id,
      input: item.input,
      expected: item.expected,
      actual,
      latencyMs,
      passed: Object.entries(item.expected).every(([field, value]) => fieldsMatch(value, actual[field])),
    })),
  };
}

export function runSearchSuite(fixture: SearchFixture): SuiteResult {
  const toHits = (pairs: [string, number][], scoreKey: "keywordScore" | "vectorScore"): RankableHit[] =>
    pairs.map(([bookId, score]) => {
      const book = fixture.catalog[bookId];
      if (!book) throw new Error(`search fixture references unknown book "${bookId}"`);
      return { bookId, ...book, [scoreKey]: score };
    });

  const maxK = Math.max(...fixture.ks);
  const rows = fixture.cases.map((item) => {
    const { value, latencyMs } = timed(() =>
      fuseSearchHits({
        query: item.query,
        keywordHits: toHits(item.keywordHits, "keywordScore"),
        vectorHits: toHits(item.vectorHits, "vectorScore"),
        topK: maxK,
      }).map((hit) => hit.bookId),
    );
    return { item, ranked: value, latencyMs };
  });

  const metrics = retrievalMetrics(
    rows.map(({ item, ranked }) => ({ relevant: item.relevant, ranked })),
    fixture.ks,
  );
  return {
    suite: "search",
    metrics: {
      ...Object.fromEntries(Object.entries(metrics.recallAtK).map(([k, v]) => [`recall${k}`, v])),
      mrr: metrics.mrr,
    },
    details: { scoredCases: metrics.scoredCases },
    cases: rows.map(({ item, ranked, latencyMs }) => ({
      id: item.id,
      input: item.query,
      expected: item.relevant,
      actual: ranked,
      latencyMs,
      // A case with no relevant books passes only when nothing is returned.
      passed:
        item.relevant.length === 0
          ? ranked.length === 0
          : reciprocalRank(item.relevant, ranked) === 1 &&
            recallAtK(item.relevant, ranked, maxK) === 1,
    })),
  };
}

export function runRoutingSuite(fixture: RoutingFixture): SuiteResult {
  const rows = fixture.cases.map((item) => {
    const { value, latencyMs } = timed(() => routeMessage(item.input));
    return { item, predicted: value as string, latencyMs };
  });
  const metrics = routingMetrics(rows.map(({ item, predicted }) => ({ expected: item.expected, predicted })));
  return {
    suite: "routing",
    metrics: { accuracy: metrics.accuracy },
    details: { confusion: metrics.confusion },
    cases: rows.map(({ item, predicted, latencyMs }) => ({
      id: item.id,
      input: item.input,
      expected: item.expected,
      actual: predicted,
      latencyMs,
      passed: predicted === item.expected,
    })),
  };
}

export function runSafetySuite(fixture: SafetyFixture): SuiteResult {
  const rows = fixture.cases.map((item) => {
    const { value, latencyMs } = timed(() => checkRequestPolicy(item.input));
    return { item, code: value, latencyMs };
  });
  const metrics = refusalMetrics(
    rows.map(({ item, code }) => ({ shouldRefuse: item.shouldRefuse, refused: code !== null })),
  );
  const { precision, recall, f1, ...counts } = metrics;
  return {
    suite: "safety",
    metrics: { precision, recall, f1 },
    details: counts,
    cases: rows.map(({ item, code, latencyMs }) => ({
      id: item.id,
      input: item.input,
      expected: item.shouldRefuse ? (item.expectedCode ?? "refuse") : "allow",
      actual: code ?? "allow",
      latencyMs,
      passed: item.shouldRefuse
        ? code !== null && (item.expectedCode === undefined || code === item.expectedCode)
        : code === null,
    })),
  };
}

/** Checks response metadata for every routing and safety prompt against the outcome the fixture expects. */
export function runProtocolSuite(routing: RoutingFixture, safety: SafetyFixture): SuiteResult {
  const prompts = [
    ...routing.cases.map((item) => ({
      id: item.id,
      input: item.input,
      shouldRefuse: false,
      expectsDelegation: item.expected !== ORCHESTRATOR_AGENT_ID,
    })),
    ...safety.cases
      .filter((item) => item.shouldRefuse)
      .map((item) => ({ id: item.id, input: item.input, shouldRefuse: true, expectsDelegation: false })),
  ];
  const rows = prompts.map((prompt) => {
    const metadata = respond(prompt.input);
    return { prompt, metadata, required: requiredMetadataFields(prompt) };
  });
  const metrics = protocolMetrics(rows.map(({ metadata, required }) => ({ metadata, required })));
  return {
    suite: "protocol",
    metrics: { completeness: metrics.completeness, fullyCompleteRate: metrics.fullyCompleteRate },
    details: { missingByField: metrics.missingByField },
    cases: rows.map(({ prompt, metadata, required }) => {
      const missing = missingFields(metadata, required);
      return {
        id: prompt.id,
        input: prompt.input,
        expected: required,
        actual: { missing },
        latencyMs: metadata.timing.totalMs,
        passed: missing.length === 0,
      };
    }),
  };
}
