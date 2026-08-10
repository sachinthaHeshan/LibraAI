import { env } from "node:process";

import { NextRequest, NextResponse } from "next/server";

import { readServerApiBaseUrl } from "@/lib/api-base-url";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext) {
  // Read via node:process so Next cannot bake an empty NEXT_PUBLIC_* at build time.
  const origin = readServerApiBaseUrl(env as Record<string, string | undefined>);
  if (!origin) {
    return NextResponse.json(
      {
        message:
          "API_URL is not set on the web server. Set API_URL (or NEXT_PUBLIC_API_URL) to your API origin, e.g. https://libraai-api.orionlabs.lk",
      },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const target = `${origin}/${path.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { message: `Unable to reach API at ${origin}` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
