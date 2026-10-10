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
    const previous = process.env.MASTRA_DEV_ORG_ID;
    delete process.env.MASTRA_DEV_ORG_ID;
    expect(() => requireOrgIdFromContext(undefined)).toThrow(
      "organization context is required",
    );
    if (previous === undefined) {
      delete process.env.MASTRA_DEV_ORG_ID;
    } else {
      process.env.MASTRA_DEV_ORG_ID = previous;
    }
  });

  it("falls back to MASTRA_DEV_ORG_ID when request context is empty", () => {
    const previous = process.env.MASTRA_DEV_ORG_ID;
    process.env.MASTRA_DEV_ORG_ID = "studio-org";
    expect(requireOrgIdFromContext(undefined)).toBe("studio-org");
    if (previous === undefined) {
      delete process.env.MASTRA_DEV_ORG_ID;
    } else {
      process.env.MASTRA_DEV_ORG_ID = previous;
    }
  });
});

describe("catalogVectorFilter", () => {
  it("always filters by organizationId", () => {
    expect(catalogVectorFilter("org-1")).toEqual({ organizationId: "org-1" });
  });
});
