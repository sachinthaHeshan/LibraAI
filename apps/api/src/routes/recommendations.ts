import type { Db } from "@libra/db";
import type { FastifyPluginAsync } from "fastify";
import { requireMemberId, requireOrgId } from "../lib/org.js";
import { getMemberRecommendations } from "../mastra/member-recommendations.js";

export function createRecommendationsRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    /** The member's "Recommended for you" books; generated on first use and every few days. */
    app.get("/recommendations", async (request) => {
      const orgId = requireOrgId(request);
      const memberId = requireMemberId(request);
      return getMemberRecommendations({ db, orgId, memberId });
    });
  };
}
