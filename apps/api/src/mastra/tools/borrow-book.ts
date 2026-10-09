import { type Db } from "@libra/db";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { createLoan } from "../../lib/create-loan.js";
import { AppError } from "../../lib/errors.js";
import { LOAN_DURATIONS, dueDateFor } from "../../lib/loan-durations.js";
import { memberIdFromContext, requireOrgIdFromContext } from "../request-org.js";

export const NOT_A_MEMBER_REASON =
  "Only library member accounts can borrow books in chat. Owners can issue loans from the Loans page.";

export function createBorrowBookTool(db: Db) {
  return createTool({
    id: "borrow-book",
    description:
      "Borrow one copy of a catalog book for the signed-in member. Only call after the member has chosen a loan duration.",
    inputSchema: z.object({
      bookId: z.string().uuid().describe("Catalog book id from searchBooks"),
      duration: z.enum(LOAN_DURATIONS).describe("Loan duration the member chose"),
    }),
    execute: async ({ bookId, duration }, context) => {
      const orgId = requireOrgIdFromContext(context?.requestContext);
      const memberId = memberIdFromContext(context?.requestContext);
      if (!memberId) {
        return { borrowed: false as const, reason: NOT_A_MEMBER_REASON };
      }

      try {
        const { loan, book } = await createLoan(db, orgId, {
          bookId,
          memberId,
          dueDate: dueDateFor(duration),
        });
        return {
          borrowed: true as const,
          loanId: loan.id,
          dueDate: loan.dueDate,
          bookId: book.id,
          title: book.title,
        };
      } catch (error) {
        if (error instanceof AppError) {
          return { borrowed: false as const, reason: error.message };
        }
        throw error;
      }
    },
  });
}
