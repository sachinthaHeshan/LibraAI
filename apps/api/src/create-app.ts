import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { createDb } from "@libra/db";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./env.js";
import { AppError } from "./lib/errors.js";
import { authPlugin } from "./plugins/auth.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createBooksRoutes } from "./routes/books.js";
import { createHealthRoutes } from "./routes/health.js";
import { createLoansRoutes } from "./routes/loans.js";
import { createMembersRoutes } from "./routes/members.js";

export async function buildApp() {
  const app = Fastify();
  const db = createDb(env.DATABASE_URL);

  await app.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "8h" },
  });
  await authPlugin(app, {});

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ message: "Invalid request" });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    return reply.status(500).send({ message: "Internal server error" });
  });

  await app.register(createHealthRoutes());
  await app.register(createAuthRoutes(db));
  await app.register(createBooksRoutes(db));
  await app.register(createMembersRoutes(db));
  await app.register(createLoansRoutes(db));

  return app;
}
