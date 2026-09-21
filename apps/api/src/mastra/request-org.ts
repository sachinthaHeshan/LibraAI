import { RequestContext } from "@mastra/core/request-context";

export type CatalogRequestValues = {
  orgId: string;
};

export function requireOrgIdFromContext(
  requestContext?: { get(key: string): unknown },
): string {
  const fromContext = requestContext?.get("orgId");
  const orgId =
    (typeof fromContext === "string" && fromContext.trim()) ||
    process.env.MASTRA_DEV_ORG_ID?.trim();
  if (!orgId) {
    throw new Error("organization context is required");
  }
  return orgId;
}

export function catalogVectorFilter(organizationId: string) {
  return { organizationId };
}

export function createCatalogRequestContext(orgId: string) {
  return new RequestContext<CatalogRequestValues>([["orgId", orgId]]);
}
