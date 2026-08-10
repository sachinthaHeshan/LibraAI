import { afterEach, describe, expect, it, vi } from "vitest";

import {
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
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("uses window.__ENV__ when present", () => {
    vi.stubGlobal("window", {
      __ENV__: { NEXT_PUBLIC_API_URL: "https://libraai-api.orionlabs.lk/" },
    });
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";

    expect(getApiBaseUrl()).toBe("https://libraai-api.orionlabs.lk");
  });

  it("falls back to process.env when window.__ENV__ is missing", () => {
    vi.stubGlobal("window", {});
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";

    expect(getApiBaseUrl()).toBe("http://localhost:3001");
  });
});
