export type RuntimeEnv = {
  NEXT_PUBLIC_API_URL?: string;
};

declare global {
  interface Window {
    __ENV__?: RuntimeEnv;
  }
}

/** Strip trailing slash so `${base}/auth/login` stays valid. */
export function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Read API base URL without Next inlining `process.env.NEXT_PUBLIC_*` at build.
 * Prefer Dokploy/runtime `API_URL`, then `NEXT_PUBLIC_API_URL`.
 */
export function readServerApiBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const record = env as Record<string, string | undefined>;
  return normalizeApiBaseUrl(record.API_URL || record.NEXT_PUBLIC_API_URL || "");
}

/** Client: runtime inject from layout, then build-time NEXT_PUBLIC fallback. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const runtime = window.__ENV__?.NEXT_PUBLIC_API_URL;
    if (runtime) {
      return normalizeApiBaseUrl(runtime);
    }
  }

  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? "");
}
