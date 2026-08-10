import { loans, members, type Db } from "@libra/db";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { calendarDateSchema } from "../lib/calendar-date.js";
import { AppError } from "../lib/errors.js";
import { requireOrgId } from "../lib/org.js";

const memberParamsSchema = z.object({
  id: z.string().uuid(),
});

const createMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  membershipDate: calendarDateSchema,
  status: z.enum(["active", "inactive"]).optional(),
});

const updateMemberSchema = createMemberSchema
  .partial()
  .refine((update) => Object.keys(update).length > 0);

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function createMembersRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get("/members", async (request) => {
      const orgId = requireOrgId(request);
      return db.query.members.findMany({
        where: eq(members.organizationId, orgId),
      });
    });

    app.get("/members/:id", async (request) => {
      const orgId = requireOrgId(request);
      const { id } = memberParamsSchema.parse(request.params);
      const member = await db.query.members.findFirst({
        where: and(eq(members.id, id), eq(members.organizationId, orgId)),
      });

      if (!member) {
        throw new AppError(404, "Member not found");
      }

      return member;
    });

    app.post("/members", async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = createMemberSchema.parse(request.body);

      try {
        const [member] = await db
          .insert(members)
          .values({ ...input, organizationId: orgId })
          .returning();

        return reply.status(201).send(member);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, "Email already exists");
        }
        throw error;
      }
    });

    app.patch("/members/:id", async (request) => {
      const orgId = requireOrgId(request);
      const { id } = memberParamsSchema.parse(request.params);
      const input = updateMemberSchema.parse(request.body);

      try {
        const [member] = await db
          .update(members)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
          .returning();

        if (!member) {
          throw new AppError(404, "Member not found");
        }

        return member;
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, "Email already exists");
        }
        throw error;
      }
    });

    app.delete("/members/:id", async (request, reply) => {
      const orgId = requireOrgId(request);
      const { id } = memberParamsSchema.parse(request.params);
      const member = await db.query.members.findFirst({
        where: and(eq(members.id, id), eq(members.organizationId, orgId)),
      });
      if (!member) {
        throw new AppError(404, "Member not found");
      }

      const loanHistory = await db.query.loans.findFirst({
        where: eq(loans.memberId, id),
      });

      if (loanHistory) {
        throw new AppError(409, "Member has loan history");
      }

      const [deleted] = await db
        .delete(members)
        .where(and(eq(members.id, id), eq(members.organizationId, orgId)))
        .returning({ id: members.id });

      if (!deleted) {
        throw new AppError(404, "Member not found");
      }

      return reply.status(204).send();
    });
  };
}
