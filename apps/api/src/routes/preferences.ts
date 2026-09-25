import { memberPreferences, type Db } from "@libra/db";
import { asc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { requireMemberId } from "../lib/org.js";
import { PREFERENCE_CATALOG, preferenceCategoryOf } from "../lib/preference-catalog.js";

const updatePreferencesSchema = z.object({
  tags: z.array(z.string().min(1)).max(100),
});

export function createPreferencesRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    async function selectedTags(memberId: string) {
      const rows = await db
        .select({ tag: memberPreferences.tag })
        .from(memberPreferences)
        .where(eq(memberPreferences.memberId, memberId))
        .orderBy(asc(memberPreferences.createdAt), asc(memberPreferences.tag));
      return rows.map((row) => row.tag);
    }

    app.get("/preferences", async (request) => {
      const memberId = requireMemberId(request);
      return { categories: PREFERENCE_CATALOG, selected: await selectedTags(memberId) };
    });

    /** Replaces the member's preferences with exactly these tags. */
    app.put("/preferences", async (request) => {
      const memberId = requireMemberId(request);
      const tags = [...new Set(updatePreferencesSchema.parse(request.body).tags)];
      const rows = tags.map((tag) => {
        const category = preferenceCategoryOf(tag);
        if (!category) {
          throw new AppError(400, `Unknown preference: ${tag}`);
        }
        return { memberId, category, tag };
      });

      await db.transaction(async (tx) => {
        await tx.delete(memberPreferences).where(eq(memberPreferences.memberId, memberId));
        if (rows.length > 0) {
          await tx.insert(memberPreferences).values(rows);
        }
      });

      return { selected: await selectedTags(memberId) };
    });
  };
}
