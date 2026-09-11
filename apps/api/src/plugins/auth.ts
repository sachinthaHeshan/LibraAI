import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { accountRole } from "../lib/org.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<unknown>;
    /** Run after `authenticate`. Rejects member accounts. */
    requireOwner: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<unknown>;
  }
}

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ message: "Unauthorized" });
      }
    },
  );
  app.decorate(
    "requireOwner",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (accountRole(request) !== "owner") {
        return reply.status(403).send({ message: "Forbidden" });
      }
    },
  );
};
