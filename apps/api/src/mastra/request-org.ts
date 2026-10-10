import { RequestContext } from "@mastra/core/request-context";

export type CatalogRequestValues = {
  orgId: string;
  /** Set when the chat user is signed in with a library member account. */
  memberId?: string;
  /** Books the recommendation tool should skip (already recommended). */
  excludeBookIds?: string[];
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

export function memberIdFromContext(
  requestContext?: { get(key: string): unknown },
): string | undefined {
  const fromContext = requestContext?.get("memberId");
  return (
    (typeof fromContext === "string" && fromContext.trim()) ||
    process.env.MASTRA_DEV_MEMBER_ID?.trim() ||
    undefined
  );
}

export function excludeBookIdsFromContext(
  requestContext?: { get(key: string): unknown },
): string[] {
  const value = requestContext?.get("excludeBookIds");
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

export function catalogVectorFilter(organizationId: string) {
  return { organizationId };
}

export function createCatalogRequestContext(orgId: string, memberId?: string) {
  const requestContext = new RequestContext<CatalogRequestValues>([["orgId", orgId]]);
  if (memberId) {
    requestContext.set("memberId", memberId);
  }
  return requestContext;
}
