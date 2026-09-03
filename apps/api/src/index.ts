import Fastify from "fastify";
import { buildApp } from "./create-app.js";
import { env } from "./env.js";

const app = await buildApp(Fastify());

await app.listen({
  port: env.PORT,
  host: "0.0.0.0",
});
