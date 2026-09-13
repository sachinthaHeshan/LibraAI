import { admins, members, organizations, type Db } from "@libra/db";
import bcrypt from "bcryptjs";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { accountRole } from "../lib/org.js";
import { isUniqueViolation } from "../lib/pg.js";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ownerSignupBodySchema = z.object({
  accountType: z.literal("owner").optional(),
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

const memberSignupBodySchema = z.object({
  accountType: z.literal("member"),
  organizationId: z.string().uuid(),
  member: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    password: z.string().min(8),
  }),
});

const signupBodySchema = z.union([memberSignupBodySchema, ownerSignupBodySchema]);

function splitName(name: string) {
  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export function createAuthRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    async function findMemberLogin(email: string) {
      return db.query.members.findFirst({
        where: and(eq(members.email, email), isNotNull(members.passwordHash)),
      });
    }

    app.get("/auth/libraries", async () => {
      return db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .orderBy(asc(organizations.name));
    });

    app.post("/auth/login", async (request) => {
      const { email, password } = loginBodySchema.parse(request.body);
      const admin = await db.query.admins.findFirst({
        where: eq(admins.email, email),
      });

      if (admin) {
        if (!(await bcrypt.compare(password, admin.passwordHash))) {
          throw new AppError(401, "Invalid credentials");
        }
        return {
          token: app.jwt.sign({
            sub: admin.id,
            orgId: admin.organizationId,
            email,
            role: "owner",
          }),
        };
      }

      const member = await findMemberLogin(email);
      if (
        !member?.passwordHash ||
        !(await bcrypt.compare(password, member.passwordHash))
      ) {
        throw new AppError(401, "Invalid credentials");
      }

      return {
        token: app.jwt.sign({
          sub: member.id,
          orgId: member.organizationId,
          email,
          role: "member",
        }),
      };
    });

    app.get(
      "/auth/me",
      { preHandler: app.authenticate },
      async (request) => {
        const role = accountRole(request);
        const profile =
          role === "member"
            ? await db.query.members
                .findFirst({ where: eq(members.id, request.user.sub) })
                .then((member) =>
                  member && {
                    id: member.id,
                    organizationId: member.organizationId,
                    email: member.email,
                    ...splitName(member.name),
                  },
                )
            : await db.query.admins.findFirst({
                where: eq(admins.id, request.user.sub),
              });

        if (!profile || profile.organizationId !== request.user.orgId) {
          throw new AppError(401, "Unauthorized");
        }

        const organization = await db.query.organizations.findFirst({
          where: eq(organizations.id, profile.organizationId),
        });

        if (!organization) {
          throw new AppError(401, "Unauthorized");
        }

        return {
          id: profile.id,
          role,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
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
        if (body.accountType === "member") {
          const member = await signupMember(db, body);
          return reply.status(201).send({
            token: app.jwt.sign({
              sub: member.id,
              orgId: member.organizationId,
              email: member.email,
              role: "member",
            }),
          });
        }

        if (await findMemberLogin(body.admin.email)) {
          throw new AppError(409, "Email already registered");
        }

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
            role: "owner",
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

/**
 * Creates the member's login. If staff already added this email to the
 * library, that member record gets the login instead of a duplicate.
 */
async function signupMember(db: Db, body: z.infer<typeof memberSignupBodySchema>) {
  const { email } = body.member;

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, body.organizationId),
  });
  if (!organization) {
    throw new AppError(404, "Library not found");
  }

  const admin = await db.query.admins.findFirst({ where: eq(admins.email, email) });
  if (admin) {
    throw new AppError(409, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(body.member.password, 12);
  const name = `${body.member.firstName} ${body.member.lastName}`.trim();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(members)
      .where(
        and(eq(members.organizationId, organization.id), eq(members.email, email)),
      )
      .limit(1)
      .for("update");

    if (existing) {
      if (existing.passwordHash) {
        throw new AppError(409, "Email already registered");
      }
      const [claimed] = await tx
        .update(members)
        .set({
          passwordHash,
          phone: existing.phone ?? body.member.phone ?? null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, existing.id))
        .returning();
      return claimed;
    }

    const [created] = await tx
      .insert(members)
      .values({
        organizationId: organization.id,
        name,
        email,
        phone: body.member.phone ?? null,
        membershipDate: new Date().toISOString().slice(0, 10),
        passwordHash,
      })
      .returning();
    return created;
  });
}
