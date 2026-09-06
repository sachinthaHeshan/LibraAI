import { loans, members, type Db } from "@libra/db";
import { and, count, eq } from "drizzle-orm";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { memberIdFromContext, requireOrgIdFromContext } from "../request-org.js";
import { NOT_A_MEMBER_REASON } from "./borrow-book.js";

export function createGetMyMemberTool(db: Db) {
  return createTool({
    id: "get-my-member",
    description:
      "Get the signed-in user's membership status and number of books currently borrowed. Borrowing is only allowed when canBorrow is true.",
    inputSchema: z.object({}),
    execute: async (_input, context) => {
      const orgId = requireOrgIdFromContext(context?.requestContext);
      const memberId = memberIdFromContext(context?.requestContext);
      if (!memberId) {
        return { canBorrow: false as const, reason: NOT_A_MEMBER_REASON };
      }

      const member = await db.query.members.findFirst({
        where: and(eq(members.id, memberId), eq(members.organizationId, orgId)),
      });
      if (!member) {
        return { canBorrow: false as const, reason: NOT_A_MEMBER_REASON };
      }

      const [{ value: activeLoans }] = await db
        .select({ value: count() })
        .from(loans)
        .where(and(eq(loans.memberId, member.id), eq(loans.status, "borrowed")));

      const active = member.status === "active";
      return {
        canBorrow: active,
        ...(active ? {} : { reason: "Your membership is inactive. Please contact the library." }),
        // Only what borrowing needs; contact details never reach the model.
        member: {
          status: member.status,
          activeLoans,
        },
      };
    },
  });
}
