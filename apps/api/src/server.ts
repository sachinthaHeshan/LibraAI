import Fastify from "fastify";
import { buildApp } from "./create-app.js";
import { env } from "./env.js";

const app = await buildApp(
  Fastify({
    logger: process.env.NODE_ENV !== "test",
  }),
);

await app.ready();

// Vercel detects listen() and routes requests to this app as a serverless function.
await app.listen({
  port: env.PORT,
  host: "0.0.0.0",
});
