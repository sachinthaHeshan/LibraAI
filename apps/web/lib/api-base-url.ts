/** Same-origin Next.js proxy prefix (see `app/backend/[...path]/route.ts`). */
export const API_PROXY_PREFIX = "/backend";

/** Strip trailing slash so `${base}/auth/login` stays valid. */
export function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Upstream API origin for the server-side proxy.
 * Pass `process.env` from a Server Component / Route Handler only.
 */
export function readServerApiBaseUrl(
  source: Record<string, string | undefined>,
): string {
  return normalizeApiBaseUrl(
    source.API_URL || source.NEXT_PUBLIC_API_URL || "",
  );
}

/** Browser always calls the same-origin proxy; CORS is not required. */
export function getApiBaseUrl(): string {
  return API_PROXY_PREFIX;
}
