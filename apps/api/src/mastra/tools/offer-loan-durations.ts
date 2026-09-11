import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { LOAN_DURATIONS } from "../../lib/loan-durations.js";

/** The chat UI renders `loanDurationOptions` from this tool's result as buttons. */
export function createOfferLoanDurationsTool() {
  return createTool({
    id: "offer-loan-durations",
    description:
      "Show the member the loan duration choices as buttons. Call this when asking how long they want to borrow an available book.",
    inputSchema: z.object({}),
    execute: async () => ({ loanDurationOptions: [...LOAN_DURATIONS] }),
  });
}
