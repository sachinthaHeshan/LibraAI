/**
 * Deterministic, API-key-free systems under test for the default evaluation.
 * The production orchestrator routes with an LLM; these rule-based baselines give a
 * reproducible reference point and define the protocol-metadata shape the eval checks.
 */
import {
  BORROW_AGENT_ID,
  ORCHESTRATOR_AGENT_ID,
  RECOMMENDATION_AGENT_ID,
  SEARCH_AGENT_ID,
} from "../mastra/constants.js";
import { isbnDigits } from "../mastra/search-query.js";
import { checkRequestPolicy, type RefusalCode } from "../safety/policy.js";

export const EVAL_PROTOCOL_VERSION = "2026-10-01";

// ---------- Entity extraction ----------

export type CatalogEntities = {
  isbn: string | null;
  title: string | null;
  author: string | null;
  genre: string | null;
};

/** Canonical genre → phrases that signal it. Longer phrases are checked first. */
const GENRE_ALIASES: Record<string, string[]> = {
  "science fiction": ["science fiction", "sci-fi", "scifi", "sci fi"],
  fantasy: ["fantasy"],
  mystery: ["mystery", "mysteries", "whodunit"],
  thriller: ["thriller", "thrillers"],
  romance: ["romance", "romantic"],
  horror: ["horror", "scary"],
  "historical fiction": ["historical fiction"],
  history: ["history"],
  biography: ["biography", "memoir"],
  poetry: ["poetry", "poems"],
  "self-help": ["self-help", "self help", "productivity"],
};

function extractGenre(text: string): string | null {
  const lower = text.toLowerCase();
  const candidates = Object.entries(GENRE_ALIASES)
    .flatMap(([genre, phrases]) => phrases.map((phrase) => ({ genre, phrase })))
    .sort((left, right) => right.phrase.length - left.phrase.length);
  const hit = candidates.find(({ phrase }) =>
    new RegExp(`(^|[^\\p{L}])${phrase.replace(/[-\s]/g, "[-\\s]?")}([^\\p{L}]|$)`, "u").test(lower),
  );
  return hit?.genre ?? null;
}

function extractIsbn(text: string): string | null {
  const match = text.match(/\b(?:97[89][-\s]?)?\d(?:[-\s]?\d){8}[-\s]?[\dXx]\b/);
  return match ? isbnDigits(match[0]) : null;
}

export function extractCatalogEntities(text: string): CatalogEntities {
  const quoted = text.match(/["“']([^"”']{2,})["”']/);
  const author = text.match(/\bby\s+([\p{Lu}][\p{L}.'-]*(?:\s+[\p{Lu}][\p{L}.'-]*)*)/u);
  return {
    isbn: extractIsbn(text),
    title: quoted ? quoted[1].trim() : null,
    author: author ? author[1].trim() : null,
    genre: extractGenre(text),
  };
}

// ---------- Safety policy ----------

// The eval scores the production policy that guards POST /ai/chat.
export { checkRequestPolicy, type RefusalCode } from "../safety/policy.js";

// ---------- Routing ----------

export type RouteTarget =
  | typeof SEARCH_AGENT_ID
  | typeof BORROW_AGENT_ID
  | typeof RECOMMENDATION_AGENT_ID
  | typeof ORCHESTRATOR_AGENT_ID;

export function routeMessage(text: string): RouteTarget {
  const lower = text.toLowerCase();
  if (/\b(borrow|check(ing)? out|checkout|loan|reserve)\b|^\s*(1|one|2|two) (week|weeks|month)\b/.test(lower)) {
    return BORROW_AGENT_ID;
  }
  if (/\b(recommend|suggest|what should i read|read next|something to read|similar to)\b/.test(lower)) {
    return RECOMMENDATION_AGENT_ID;
  }
  if (
    /\b(do you have|do we have|find|search|look(ing)? for|available|availability|isbn|who wrote|books? by|copies)\b/.test(lower) ||
    extractCatalogEntities(text).isbn !== null
  ) {
    return SEARCH_AGENT_ID;
  }
  return ORCHESTRATOR_AGENT_ID;
}

// ---------- Response metadata ----------

export type ResponseMetadata = {
  protocolVersion: string;
  agentId: string;
  delegatedAgentId: string | null;
  toolIds: string[];
  refusal: { code: RefusalCode } | null;
  entities: CatalogEntities;
  timing: { totalMs: number };
};

const TOOLS_BY_AGENT: Record<string, string[]> = {
  [SEARCH_AGENT_ID]: ["search-books"],
  [BORROW_AGENT_ID]: ["get-book", "offer-loan-durations"],
  [RECOMMENDATION_AGENT_ID]: ["recommend-books"],
  [ORCHESTRATOR_AGENT_ID]: [],
};

/** Simulates one chat turn: policy first (no agent or tools on refusal), then routing. */
export function respond(text: string): ResponseMetadata {
  const started = performance.now();
  const refusal = checkRequestPolicy(text);
  const delegated = refusal ? null : routeMessage(text);
  return {
    protocolVersion: EVAL_PROTOCOL_VERSION,
    agentId: ORCHESTRATOR_AGENT_ID,
    delegatedAgentId: delegated === ORCHESTRATOR_AGENT_ID ? null : delegated,
    toolIds: delegated ? TOOLS_BY_AGENT[delegated] : [],
    refusal: refusal ? { code: refusal } : null,
    entities: extractCatalogEntities(text),
    timing: { totalMs: performance.now() - started },
  };
}

/**
 * Required dot-paths for a response, based on the fixture's expected outcome (not the
 * actual one), so a refusal that omits its code or a delegation that omits the agent is caught.
 */
export function requiredMetadataFields(expected: {
  shouldRefuse: boolean;
  expectsDelegation: boolean;
}): string[] {
  const base = ["protocolVersion", "agentId", "toolIds", "entities", "timing.totalMs"];
  if (expected.shouldRefuse) return [...base, "refusal.code"];
  if (expected.expectsDelegation) return [...base, "delegatedAgentId"];
  return base;
}
