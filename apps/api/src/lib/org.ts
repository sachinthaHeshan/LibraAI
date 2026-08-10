import type { FastifyRequest } from "fastify";
import { AppError } from "./errors.js";

export function requireOrgId(request: FastifyRequest): string {
  const orgId = request.user?.orgId;
  if (!orgId) {
    throw new AppError(401, "Unauthorized");
  }
  return orgId;
}
