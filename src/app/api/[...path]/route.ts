import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_API_URL;
const PROXY_SECRET = process.env.EVOTRAS_PROXY_SECRET;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!BACKEND_URL || !PROXY_SECRET) {
    return NextResponse.json(
      { message: "API proxy yapılandırması eksik" },
      { status: 500 },
    );
  }

  const { path } = await context.params;

  const endpoint = path.map(encodeURIComponent).join("/");
  const search = request.nextUrl.search;

  const targetUrl = `${BACKEND_URL.replace(/\/+$/, "")}/api/${endpoint}${search}`;

  // Local geliştirmede platform domain'ini sabit veriyoruz.
  // Production'da gelen host bilgisi kullanılabilir.
  const originalHost =
    process.env.EVOTRAS_ORIGINAL_HOST ||
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host");

  console.log("[EVOTRAS PROXY]", {
    backendUrl: BACKEND_URL,
    hasProxySecret: Boolean(PROXY_SECRET),
    originalHost,
  });

  if (!originalHost) {
    return NextResponse.json(
      { message: "Original host bilgisi bulunamadı" },
      { status: 400 },
    );
  }

  const headers = new Headers();

  // Yalnızca backend için gerekli header'ları aktar.
  const forwardedHeaders = [
    "accept",
    "content-type",
    "cookie",
    "x-xsrf-token",
    "authorization",
  ];

  for (const name of forwardedHeaders) {
    const value = request.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  }

  // Gizli bilgiler yalnızca Next.js sunucusunda kullanılır.
  headers.set("X-Evotras-Proxy-Secret", PROXY_SECRET);
  headers.set("X-Evotras-Original-Host", originalHost);

  const method = request.method;

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = new Headers();

    const contentType = upstream.headers.get("content-type");
    const setCookie = upstream.headers.get("set-cookie");
    const cacheControl = upstream.headers.get("cache-control");

    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    if (setCookie) {
      responseHeaders.set("set-cookie", setCookie);
    }

    if (cacheControl) {
      responseHeaders.set("cache-control", cacheControl);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: "Backend servisine ulaşılamadı" },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
