import type { FastifyRequest } from "fastify";
import type { AccountRole } from "../types/fastify-jwt.js";
import { AppError } from "./errors.js";

export function requireOrgId(request: FastifyRequest): string {
  const orgId = request.user?.orgId;
  if (!orgId) {
    throw new AppError(401, "Unauthorized");
  }
  return orgId;
}

export function accountRole(request: FastifyRequest): AccountRole {
  return request.user?.role ?? "owner";
}

/** For a member token, `sub` is the member id. */
export function requireMemberId(request: FastifyRequest): string {
  if (accountRole(request) !== "member" || !request.user?.sub) {
    throw new AppError(403, "Only library members can do this");
  }
  return request.user.sub;
}
