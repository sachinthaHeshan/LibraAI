/**
 * Pure scoring functions for the evaluation harness.
 * Ratios with an empty denominator return null ("not applicable") instead of a misleading 0 or 1.
 */

export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function mean(values: number[]): number | null {
  return ratio(
    values.reduce((sum, value) => sum + value, 0),
    values.length,
  );
}

// ---------- Field accuracy (entity extraction) ----------

export type FieldValue = string | string[] | null | undefined;

function normalizeField(value: FieldValue): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => item.trim().toLowerCase()))].sort().join("|");
  }
  return value.trim().toLowerCase();
}

/** Strings compare case-insensitively; arrays compare as sets; null, undefined and "" are equal. */
export function fieldsMatch(expected: FieldValue, actual: FieldValue): boolean {
  return normalizeField(expected) === normalizeField(actual);
}

export type FieldAccuracy = {
  /** Correct fields / total fields across every case. */
  overall: number | null;
  /** Cases where every expected field matched. */
  exactMatchRate: number | null;
  perField: Record<string, number | null>;
};

export function fieldAccuracy(
  cases: { expected: Record<string, FieldValue>; actual: Record<string, FieldValue> }[],
): FieldAccuracy {
  const totals = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  let total = 0;
  let exact = 0;

  for (const { expected, actual } of cases) {
    let allCorrect = true;
    for (const [field, value] of Object.entries(expected)) {
      const ok = fieldsMatch(value, actual[field]);
      const tally = totals.get(field) ?? { correct: 0, total: 0 };
      tally.total += 1;
      tally.correct += ok ? 1 : 0;
      totals.set(field, tally);
      total += 1;
      correct += ok ? 1 : 0;
      allCorrect &&= ok;
    }
    exact += allCorrect ? 1 : 0;
  }

  return {
    overall: ratio(correct, total),
    exactMatchRate: ratio(exact, cases.length),
    perField: Object.fromEntries(
      [...totals].map(([field, tally]) => [field, ratio(tally.correct, tally.total)]),
    ),
  };
}

// ---------- Retrieval (Recall@K, MRR) ----------

/** Share of relevant ids found in the first k ranked ids. Null when nothing is relevant. */
export function recallAtK(relevant: string[], ranked: string[], k: number): number | null {
  if (k < 1) throw new RangeError("k must be >= 1");
  const wanted = new Set(relevant);
  const found = new Set(ranked.slice(0, k).filter((id) => wanted.has(id)));
  return ratio(found.size, wanted.size);
}

/** 1 / rank of the first relevant id, or 0 when none is retrieved. Null when nothing is relevant. */
export function reciprocalRank(relevant: string[], ranked: string[]): number | null {
  if (relevant.length === 0) return null;
  const wanted = new Set(relevant);
  const index = ranked.findIndex((id) => wanted.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

export type RetrievalMetrics = {
  recallAtK: Record<string, number | null>;
  mrr: number | null;
  /** Cases with relevant ids (cases without any are skipped by recall and MRR). */
  scoredCases: number;
};

export function retrievalMetrics(
  cases: { relevant: string[]; ranked: string[] }[],
  ks: number[],
): RetrievalMetrics {
  const scored = cases.filter((item) => item.relevant.length > 0);
  return {
    recallAtK: Object.fromEntries(
      ks.map((k) => [
        `@${k}`,
        mean(scored.map((item) => recallAtK(item.relevant, item.ranked, k) ?? 0)),
      ]),
    ),
    mrr: mean(scored.map((item) => reciprocalRank(item.relevant, item.ranked) ?? 0)),
    scoredCases: scored.length,
  };
}

// ---------- Routing accuracy ----------

export type RoutingMetrics = {
  accuracy: number | null;
  /** confusion[expected][predicted] = count */
  confusion: Record<string, Record<string, number>>;
};

export function routingMetrics(cases: { expected: string; predicted: string }[]): RoutingMetrics {
  const confusion: Record<string, Record<string, number>> = {};
  let correct = 0;
  for (const { expected, predicted } of cases) {
    confusion[expected] ??= {};
    confusion[expected][predicted] = (confusion[expected][predicted] ?? 0) + 1;
    correct += expected === predicted ? 1 : 0;
  }
  return { accuracy: ratio(correct, cases.length), confusion };
}

// ---------- Refusal precision / recall ----------

export type RefusalMetrics = {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
};

/** Positive class = "refused". */
export function refusalMetrics(
  cases: { shouldRefuse: boolean; refused: boolean }[],
): RefusalMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const { shouldRefuse, refused } of cases) {
    if (refused && shouldRefuse) tp += 1;
    else if (refused) fp += 1;
    else if (shouldRefuse) fn += 1;
    else tn += 1;
  }
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const f1 =
    precision === null || recall === null
      ? null
      : precision + recall === 0
        ? 0
        : (2 * precision * recall) / (precision + recall);
  return {
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    trueNegatives: tn,
    precision,
    recall,
    f1,
  };
}

// ---------- Protocol-metadata completeness ----------

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function getPath(record: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
    return undefined;
  }, record);
}

/** Missing required dot-paths. Empty arrays count as present (e.g. "no tools were used"). */
export function missingFields(record: unknown, required: string[]): string[] {
  return required.filter((path) => !isPresent(getPath(record, path)));
}

export type ProtocolMetrics = {
  /** Mean share of required fields present per response. */
  completeness: number | null;
  /** Responses with every required field present. */
  fullyCompleteRate: number | null;
  missingByField: Record<string, number>;
};

export function protocolMetrics(
  cases: { metadata: unknown; required: string[] }[],
): ProtocolMetrics {
  const missingByField: Record<string, number> = {};
  const shares: number[] = [];
  let complete = 0;
  for (const { metadata, required } of cases) {
    const missing = missingFields(metadata, required);
    for (const field of missing) missingByField[field] = (missingByField[field] ?? 0) + 1;
    shares.push(required.length === 0 ? 1 : (required.length - missing.length) / required.length);
    complete += missing.length === 0 ? 1 : 0;
  }
  return {
    completeness: mean(shares),
    fullyCompleteRate: ratio(complete, cases.length),
    missingByField,
  };
}
