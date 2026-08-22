import { admins, members, type Db } from "@libra/db";
import bcrypt from "bcryptjs";
import { and, eq, isNotNull } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { requireOrgId } from "../lib/org.js";
import { isUniqueViolation } from "../lib/pg.js";

const staffParamsSchema = z.object({
  id: z.string().uuid(),
});

const createStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const updateStaffSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((update) => Object.keys(update).length > 0);

function toPublicAdmin(row: typeof admins.$inferSelect) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    createdAt: row.createdAt,
  };
}

export function createStaffRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);
    app.addHook("preHandler", app.requireOwner);

    app.get("/staff", async (request) => {
      const orgId = requireOrgId(request);
      const rows = await db.query.admins.findMany({
        where: eq(admins.organizationId, orgId),
      });
      return rows.map(toPublicAdmin);
    });

    app.post("/staff", async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = createStaffSchema.parse(request.body);

      const memberLogin = await db.query.members.findFirst({
        where: and(eq(members.email, input.email), isNotNull(members.passwordHash)),
      });
      if (memberLogin) {
        throw new AppError(409, "Email already exists");
      }

      try {
        const [admin] = await db
          .insert(admins)
          .values({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash: await bcrypt.hash(input.password, 12),
            organizationId: orgId,
          })
          .returning();

        return reply.status(201).send(toPublicAdmin(admin));
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, "Email already exists");
        }
        throw error;
      }
    });

    app.patch("/staff/:id", async (request) => {
      const orgId = requireOrgId(request);
      const { id } = staffParamsSchema.parse(request.params);
      const input = updateStaffSchema.parse(request.body);

      const updates: Partial<typeof admins.$inferInsert> = {};
      if (input.firstName !== undefined) updates.firstName = input.firstName;
      if (input.lastName !== undefined) updates.lastName = input.lastName;
      if (input.email !== undefined) updates.email = input.email;
      if (input.password !== undefined) {
        updates.passwordHash = await bcrypt.hash(input.password, 12);
      }

      try {
        const [admin] = await db
          .update(admins)
          .set(updates)
          .where(and(eq(admins.id, id), eq(admins.organizationId, orgId)))
          .returning();

        if (!admin) {
          throw new AppError(404, "Staff not found");
        }

        return toPublicAdmin(admin);
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (isUniqueViolation(error)) {
          throw new AppError(409, "Email already exists");
        }
        throw error;
      }
    });

    app.delete("/staff/:id", async (request, reply) => {
      const orgId = requireOrgId(request);
      const { id } = staffParamsSchema.parse(request.params);

      if (id === request.user.sub) {
        throw new AppError(400, "Cannot delete yourself");
      }

      // Serialize last-admin checks: lock org admin rows so concurrent
      // deletes cannot both pass a count of 2 and leave the org with 0.
      await db.transaction(async (tx) => {
        const orgAdmins = await tx
          .select()
          .from(admins)
          .where(eq(admins.organizationId, orgId))
          .for("update");

        const existing = orgAdmins.find((admin) => admin.id === id);
        if (!existing) {
          throw new AppError(404, "Staff not found");
        }

        if (orgAdmins.length <= 1) {
          throw new AppError(400, "Cannot delete the last admin");
        }

        await tx
          .delete(admins)
          .where(and(eq(admins.id, id), eq(admins.organizationId, orgId)));
      });

      return reply.status(204).send();
    });
  };
}
