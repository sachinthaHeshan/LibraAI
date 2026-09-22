export type ChatBook = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string | null;
  description: string | null;
  publishedYear: number | null;
  totalCopies: number;
  availableCopies: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

type ToolResultLike = { name?: string; result?: unknown; payload?: unknown };

/**
 * Visits every object in tool results, including results nested inside sub-agent calls.
 * `agentTool` is the enclosing sub-agent call (e.g. "agent-borrowAgent"), if any.
 * Return false from `visit` to skip that object's children.
 */
function walkToolResults(
  toolResults: ToolResultLike[],
  visit: (record: Record<string, unknown>, agentTool: string | undefined) => boolean | void,
) {
  function walk(value: unknown, agentTool: string | undefined) {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, agentTool);
      return;
    }
    if (typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    if (visit(record, agentTool) === false) return;
    const childAgentTool =
      typeof record.toolName === "string" && record.toolName.startsWith("agent-")
        ? record.toolName
        : agentTool;
    if (record.book) walk(record.book, childAgentTool);
    if (record.result) walk(record.result, childAgentTool);
    if (record.payload) walk(record.payload, childAgentTool);
    if (record.relevantContext) walk(record.relevantContext, childAgentTool);
    if (record.sources) walk(record.sources, childAgentTool);
    if (record.recommendations) walk(record.recommendations, childAgentTool);
    if (record.subAgentToolResults) walk(record.subAgentToolResults, childAgentTool);
  }

  for (const tool of toolResults) {
    walk(tool, undefined);
  }
}

export function extractBookIdsFromToolResults(toolResults: ToolResultLike[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  function add(id: string) {
    if (!isUuid(id) || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  }

  walkToolResults(toolResults, (record, agentTool) => {
    // While borrowing, search hits are only candidates; show the book the agent settled on.
    if (agentTool === "agent-borrowAgent" && record.toolName === "searchBooks") return false;
    if (typeof record.bookId === "string") add(record.bookId);
    if (
      typeof record.id === "string" &&
      (typeof record.title === "string" || typeof record.author === "string")
    ) {
      add(record.id);
    }
  });

  return ids;
}

/** Quick-reply options for the chat UI, e.g. loan durations offered by the borrow agent. */
export function extractChatOptionsFromToolResults(toolResults: ToolResultLike[]): string[] {
  let options: string[] = [];
  walkToolResults(toolResults, (record) => {
    const offered = record.loanDurationOptions;
    if (Array.isArray(offered) && offered.every((item) => typeof item === "string")) {
      options = offered;
    }
  });
  return options;
}

export type ChatProvenance = {
  /** Specialist agents the orchestrator delegated to, e.g. "searchAgent". */
  agents: string[];
  /** Tools those agents called, e.g. "searchBooks". */
  tools: string[];
};

/** Which agents and tools produced a reply. Names only — never tool inputs or outputs. */
export function extractProvenanceFromToolResults(toolResults: ToolResultLike[]): ChatProvenance {
  const agents = new Set<string>();
  const tools = new Set<string>();
  walkToolResults(toolResults, (record) => {
    if (typeof record.toolName !== "string") return;
    if (record.toolName.startsWith("agent-")) agents.add(record.toolName.slice("agent-".length));
    else tools.add(record.toolName);
  });
  return { agents: [...agents], tools: [...tools] };
}
