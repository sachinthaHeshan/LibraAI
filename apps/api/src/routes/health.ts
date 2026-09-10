import type { FastifyPluginAsync } from "fastify";

export function createHealthRoutes(): FastifyPluginAsync {
  return async (app) => {
    app.get("/health", async () => ({ status: "ok" }));
  };
}
