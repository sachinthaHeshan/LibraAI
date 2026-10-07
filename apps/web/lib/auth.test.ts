import { describe, expect, it } from "vitest";

import { getTokenRole } from "./auth";

function token(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${body}.signature`;
}

describe("getTokenRole", () => {
  it("reads the member role", () => {
    expect(getTokenRole(token({ role: "member" }))).toBe("member");
  });

  it("treats tokens without a role as owner", () => {
    expect(getTokenRole(token({ sub: "x" }))).toBe("owner");
  });

  it("returns null for missing or malformed tokens", () => {
    expect(getTokenRole(null)).toBeNull();
    expect(getTokenRole("not-a-jwt")).toBeNull();
  });
});
