import { admins, type Db } from "@libra/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
        token: app.jwt.sign({ sub: admin.id, email }),
      };
    });
  };
}
