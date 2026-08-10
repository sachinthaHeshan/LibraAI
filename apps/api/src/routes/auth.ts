import { admins, organizations, type Db } from "@libra/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { isUniqueViolation } from "../lib/pg.js";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupBodySchema = z.object({
  plan: z.enum(["starter", "pro", "enterprise"]),
  organization: z.object({
    name: z.string().min(1),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  admin: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export function createAuthRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.post("/auth/login", async (request) => {
      const { email, password } = loginBodySchema.parse(request.body);
      const admin = await db.query.admins.findFirst({
        where: eq(admins.email, email),
      });

      if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
        throw new AppError(401, "Invalid credentials");
      }

      return {
        token: app.jwt.sign({
          sub: admin.id,
          orgId: admin.organizationId,
          email,
        }),
      };
    });

    app.get(
      "/auth/me",
      { preHandler: app.authenticate },
      async (request) => {
        const admin = await db.query.admins.findFirst({
          where: eq(admins.id, request.user.sub),
        });

        if (!admin || admin.organizationId !== request.user.orgId) {
          throw new AppError(401, "Unauthorized");
        }

        const organization = await db.query.organizations.findFirst({
          where: eq(organizations.id, admin.organizationId),
        });

        if (!organization) {
          throw new AppError(401, "Unauthorized");
        }

        return {
          id: admin.id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          organization: {
            id: organization.id,
            name: organization.name,
          },
        };
      },
    );

    app.post("/auth/signup", async (request, reply) => {
      const body = signupBodySchema.parse(request.body);

      try {
        const result = await db.transaction(async (tx) => {
          const [org] = await tx
            .insert(organizations)
            .values({
              name: body.organization.name,
              address: body.organization.address ?? null,
              phone: body.organization.phone ?? null,
              plan: body.plan,
            })
            .returning();

          const passwordHash = await bcrypt.hash(body.admin.password, 12);
          const [admin] = await tx
            .insert(admins)
            .values({
              firstName: body.admin.firstName,
              lastName: body.admin.lastName,
              email: body.admin.email,
              passwordHash,
              organizationId: org.id,
            })
            .returning();

          return { org, admin };
        });

        return reply.status(201).send({
          token: app.jwt.sign({
            sub: result.admin.id,
            orgId: result.org.id,
            email: result.admin.email,
          }),
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, "Email already registered");
        }
        throw error;
      }
    });
  };
}
