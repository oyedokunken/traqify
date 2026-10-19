import { NextFunction, Request, Response } from "express";
import request from "supertest";
import app from "../src/app";
import { forwardedClientIp } from "../src/middleware/proxy-ip";
import { refreshCookieOptions } from "../src/utils/session";
import { mockGoogle } from "./helpers/google";

const SECRET = process.env.PROXY_SHARED_SECRET!;

/** A minimal request whose ip behaves like Express's: derived from the socket until overridden. */
function fakeRequest(headers: Record<string, string>, ip = "10.0.0.1") {
  const req = { ip, get: (name: string) => headers[name.toLowerCase()] } as unknown as Request;
  return req;
}

function run(headers: Record<string, string>) {
  const req = fakeRequest(headers);
  const next = jest.fn() as unknown as NextFunction;
  forwardedClientIp(req, {} as Response, next);
  expect(next).toHaveBeenCalledTimes(1);
  return req.ip;
}

describe("client IP behind the frontend proxy", () => {
  it("uses the forwarded address when the shared secret matches", () => {
    expect(run({ "x-proxy-secret": SECRET, "x-client-ip": "203.0.113.7" })).toBe("203.0.113.7");
    expect(run({ "x-proxy-secret": SECRET, "x-client-ip": "2001:db8::1" })).toBe("2001:db8::1");
  });

  it("ignores the forwarded address without the secret, or with the wrong one", () => {
    expect(run({ "x-client-ip": "203.0.113.7" })).toBe("10.0.0.1");
    expect(run({ "x-proxy-secret": "wrong-secret", "x-client-ip": "203.0.113.7" })).toBe("10.0.0.1");
    expect(run({ "x-proxy-secret": SECRET.slice(0, -1), "x-client-ip": "203.0.113.7" })).toBe("10.0.0.1");
    expect(run({ "x-proxy-secret": "", "x-client-ip": "203.0.113.7" })).toBe("10.0.0.1");
  });

  it("ignores values that are not a single IP address", () => {
    for (const value of ["", "not-an-ip", "203.0.113.7, 198.51.100.1", "203.0.113.7:80", "<script>", "999.1.1.1"]) {
      expect({ value, ip: run({ "x-proxy-secret": SECRET, "x-client-ip": value }) }).toEqual({ value, ip: "10.0.0.1" });
    }
  });

  it("does nothing when no secret is configured, even if a header is sent", () => {
    const saved = process.env.PROXY_SHARED_SECRET;
    delete process.env.PROXY_SHARED_SECRET;
    try {
      expect(run({ "x-proxy-secret": "anything", "x-client-ip": "203.0.113.7" })).toBe("10.0.0.1");
      expect(run({ "x-client-ip": "203.0.113.7" })).toBe("10.0.0.1");
    } finally {
      process.env.PROXY_SHARED_SECRET = saved;
    }
  });

  describe("rate limiting sees the real client, not the proxy", () => {
    beforeEach(() => { process.env.RATE_LIMIT_ENABLED = "true"; });
    afterEach(() => { delete process.env.RATE_LIMIT_ENABLED; });

    const forgot = (email: string, headers: Record<string, string>) =>
      request(app).post("/api/auth/forgot-password").set(headers).send({ email });

    it("gives each forwarded client its own budget", async () => {
      const a = { "x-proxy-secret": SECRET, "x-client-ip": "198.51.100.10" };
      const b = { "x-proxy-secret": SECRET, "x-client-ip": "198.51.100.11" };
      for (let i = 1; i <= 10; i++) expect((await forgot(`a${i}@example.com`, a)).status).toBe(200);
      expect((await forgot("a11@example.com", a)).status).toBe(429);
      expect((await forgot("b1@example.com", b)).status).toBe(200);
    });

    it("cannot be used to dodge a limit by claiming a different address without the secret", async () => {
      for (let i = 1; i <= 10; i++) {
        expect((await forgot(`c${i}@example.com`, { "x-client-ip": `198.51.100.${100 + i}` })).status).toBe(200);
      }
      expect((await forgot("c11@example.com", { "x-client-ip": "198.51.100.250" })).status).toBe(429);
    });
  });
});

describe("session cookie", () => {
  const original = { NODE_ENV: process.env.NODE_ENV, COOKIE_SAMESITE: process.env.COOKIE_SAMESITE };
  afterEach(() => {
    process.env.NODE_ENV = original.NODE_ENV;
    if (original.COOKIE_SAMESITE === undefined) delete process.env.COOKIE_SAMESITE;
    else process.env.COOKIE_SAMESITE = original.COOKIE_SAMESITE;
  });

  it("is httpOnly, Secure and SameSite=Lax in production by default", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SAMESITE;
    expect(refreshCookieOptions()).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/api/auth" });
  });

  it("is SameSite=Lax outside production and not Secure", () => {
    process.env.NODE_ENV = "development";
    delete process.env.COOKIE_SAMESITE;
    expect(refreshCookieOptions()).toMatchObject({ sameSite: "lax", secure: false, httpOnly: true });
  });

  it("only moves away from Lax when explicitly configured, and then forces Secure for None", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAMESITE = "none";
    expect(refreshCookieOptions()).toMatchObject({ sameSite: "none", secure: true });
    process.env.COOKIE_SAMESITE = "garbage";
    expect(refreshCookieOptions()).toMatchObject({ sameSite: "lax" });
  });
});

describe("Google sign in runs on the frontend origin", () => {
  const callbackUrl = "http://localhost:3000/api/auth/google-callback";

  it("sends Google to a redirect URI on the frontend origin", async () => {
    const res = await request(app).get("/api/auth/google-redirect");
    expect(new URL(res.headers.location).searchParams.get("redirect_uri")).toBe(callbackUrl);
  });

  it("uses the same redirect URI when exchanging the code", async () => {
    const spy = mockGoogle({ email: "origin@example.com" });
    const start = await request(app).get("/api/auth/google-redirect");
    const state = new URL(start.headers.location).searchParams.get("state");
    const cookie = ([] as string[]).concat(start.headers["set-cookie"] ?? []).find((c) => c.startsWith("oauth_state="))!.split(";")[0];

    await request(app).get(`/api/auth/google-callback?code=abc&state=${state}`).set("Cookie", cookie);

    const tokenCall = spy.mock.calls.find(([url]) => String(url) === "https://oauth2.googleapis.com/token")!;
    expect(new URLSearchParams(String((tokenCall[1] as RequestInit).body)).get("redirect_uri")).toBe(callbackUrl);
    spy.mockRestore();
  });

  it("no longer depends on API_URL", async () => {
    const saved = process.env.API_URL;
    process.env.API_URL = "https://should-not-be-used.example.test";
    try {
      const res = await request(app).get("/api/auth/google-redirect");
      expect(res.headers.location).not.toContain("should-not-be-used");
    } finally {
      if (saved === undefined) delete process.env.API_URL;
      else process.env.API_URL = saved;
    }
  });
});
