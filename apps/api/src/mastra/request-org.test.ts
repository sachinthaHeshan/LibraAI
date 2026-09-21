import { describe, expect, it } from "vitest";
import { RequestContext } from "@mastra/core/request-context";
import {
  catalogVectorFilter,
  requireOrgIdFromContext,
} from "./request-org.js";

describe("requireOrgIdFromContext", () => {
  it("returns the org id from request context", () => {
    const requestContext = new RequestContext([["orgId", "org-1"]]);
    expect(requireOrgIdFromContext(requestContext)).toBe("org-1");
  });

  it("throws when org id is missing", () => {
    expect(() => requireOrgIdFromContext(undefined)).toThrow(
      "organization context is required",
    );
  });
});

describe("catalogVectorFilter", () => {
  it("always filters by organizationId", () => {
    expect(catalogVectorFilter("org-1")).toEqual({ organizationId: "org-1" });
  });
});
