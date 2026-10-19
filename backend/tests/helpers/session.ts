import request from "supertest";
import app from "../../src/app";

export const FRONTEND = "http://localhost:3000";

/** Extracts the "name=value" pair of a cookie from a response's Set-Cookie headers. */
export function cookiePair(res: { headers: Record<string, unknown> }, name = "traqify_rt"): string | undefined {
  const setCookie = ([] as string[]).concat((res.headers["set-cookie"] as string[] | string | undefined) ?? []);
  return setCookie.find((c) => c.startsWith(`${name}=`))?.split(";")[0];
}

/** The raw Set-Cookie header for a cookie, with its attributes. */
export function setCookieHeader(res: { headers: Record<string, unknown> }, name = "traqify_rt"): string | undefined {
  const setCookie = ([] as string[]).concat((res.headers["set-cookie"] as string[] | string | undefined) ?? []);
  return setCookie.find((c) => c.startsWith(`${name}=`));
}

/** Calls POST /api/auth/refresh the way the web app does. Pass overrides to simulate other callers. */
export function refresh(cookie: string | undefined, headers: Record<string, string | null> = {}) {
  const merged: Record<string, string | null> = { Origin: FRONTEND, "X-Requested-By": "traqify", ...headers };
  const req = request(app).post("/api/auth/refresh");
  if (cookie) req.set("Cookie", cookie);
  for (const [key, value] of Object.entries(merged)) if (value !== null) req.set(key, value);
  return req;
}

export function logout(cookie: string | undefined, accessToken?: string, headers: Record<string, string | null> = {}) {
  const merged: Record<string, string | null> = { Origin: FRONTEND, "X-Requested-By": "traqify", ...headers };
  const req = request(app).post("/api/auth/logout");
  if (cookie) req.set("Cookie", cookie);
  if (accessToken) req.set("Authorization", `Bearer ${accessToken}`);
  for (const [key, value] of Object.entries(merged)) if (value !== null) req.set(key, value);
  return req;
}
