import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin API proxy. The browser only ever calls /api/* on this site, and this middleware forwards the request
 * to the API project. That makes the API's refresh cookie a first party cookie (it works in Safari and other browsers
 * that block third party cookies) and lets the CSRF origin check compare against one origin.
 *
 * The API is reached through API_ORIGIN, a server side variable that never reaches the browser. The visitor's address
 * travels in X-Client-Ip together with PROXY_SHARED_SECRET; the API trusts the address only when the secret matches,
 * so per IP rate limits and audit logs see the visitor instead of this proxy. Both headers are always overwritten, so
 * a visitor cannot send their own.
 */
export const config = { matcher: "/api/:path*" };

const visitorIp = (request: NextRequest): string | null => {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
};

export function middleware(request: NextRequest) {
  const origin = process.env.API_ORIGIN || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000");
  if (!origin) {
    return NextResponse.json({ error: "The API is not configured." }, { status: 503 });
  }

  const headers = new Headers(request.headers);
  headers.delete("x-client-ip");
  headers.delete("x-proxy-secret");

  const secret = process.env.PROXY_SHARED_SECRET;
  const ip = visitorIp(request);
  if (secret && ip) {
    headers.set("x-proxy-secret", secret);
    headers.set("x-client-ip", ip);
  }

  const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, origin);
  return NextResponse.rewrite(target, { request: { headers } });
}
