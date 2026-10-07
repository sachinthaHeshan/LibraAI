import { type Db } from "@libra/db";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { findRecommendations, recommendationBasis } from "../recommend.js";
import {
  excludeBookIdsFromContext,
  memberIdFromContext,
  requireOrgIdFromContext,
} from "../request-org.js";

export function createRecommendBooksTool(db: Db) {
  return createTool({
    id: "recommend-books",
    description:
      "Recommend catalog books for the signed-in user from their reading preferences, loan history, and an optional focus from their request. Books they already borrowed are excluded and available books come first.",
    inputSchema: z.object({
      focus: z
        .string()
        .optional()
        .describe(
          "Genre, topic, mood, or author named in the user's own message, e.g. 'science fiction' or 'something cozy'. Omit when they just want recommendations — never pass words like 'reading history' or 'preferences'.",
        ),
    }),
    execute: async ({ focus }, context) => {
      const orgId = requireOrgIdFromContext(context?.requestContext);
      const memberId = memberIdFromContext(context?.requestContext);
      const { profile, recommendations, focusMatched } = await findRecommendations({
        db,
        orgId,
        memberId,
        focus,
        exclude: excludeBookIdsFromContext(context?.requestContext),
      });

      return {
        basedOn: recommendationBasis(profile, recommendations, focus, focusMatched),
        // Titles only: book ids here would turn into chat book cards.
        profile: {
          isMember: Boolean(memberId),
          preferences: profile.preferences,
          recentlyBorrowed: profile.history.slice(0, 5).map((loan) => loan.title),
        },
        ...(focusMatched === undefined ? {} : { focusMatched }),
        recommendations,
      };
    },
  });
}
