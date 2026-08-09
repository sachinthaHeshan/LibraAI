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

export async function buildApp() {
  const app = Fastify();
  const db = createDb(env.DATABASE_URL);

  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(jwt, { secret: env.JWT_SECRET });
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

  await app.register(createAuthRoutes(db));
  await app.register(createBooksRoutes(db));

  return app;
}
