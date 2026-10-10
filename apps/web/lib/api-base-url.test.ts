import { describe, expect, it } from "vitest";

import {
  API_PROXY_PREFIX,
  getApiBaseUrl,
  normalizeApiBaseUrl,
  readServerApiBaseUrl,
} from "./api-base-url";

describe("normalizeApiBaseUrl", () => {
  it("strips a trailing slash", () => {
    expect(normalizeApiBaseUrl("https://api.example.com/")).toBe(
      "https://api.example.com",
    );
  });
});

describe("readServerApiBaseUrl", () => {
  it("prefers API_URL over NEXT_PUBLIC_API_URL", () => {
    expect(
      readServerApiBaseUrl({
        API_URL: "https://api.example.com/",
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
      }),
    ).toBe("https://api.example.com");
  });

  it("falls back to NEXT_PUBLIC_API_URL", () => {
    expect(
      readServerApiBaseUrl({
        NEXT_PUBLIC_API_URL: "https://libraai-api.orionlabs.lk",
      }),
    ).toBe("https://libraai-api.orionlabs.lk");
  });
});

describe("getApiBaseUrl", () => {
  it("always uses the same-origin proxy prefix", () => {
    expect(getApiBaseUrl()).toBe(API_PROXY_PREFIX);
    expect(getApiBaseUrl()).toBe("/backend");
  });
});
