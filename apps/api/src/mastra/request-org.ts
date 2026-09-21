import { RequestContext } from "@mastra/core/request-context";

export type CatalogRequestValues = {
  orgId: string;
};

export function requireOrgIdFromContext(
  requestContext: RequestContext<CatalogRequestValues> | undefined,
): string {
  const orgId = requestContext?.get("orgId");
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
