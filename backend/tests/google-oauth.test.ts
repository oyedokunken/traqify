import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { createUser } from "./helpers/factories";
import { mockGoogle } from "./helpers/google";
import { cookiePair, refresh } from "./helpers/session";

const FRONTEND = "http://localhost:3000";

/** Starts the flow like a browser would and returns the state and its cookie. */
async function startFlow() {
  const res = await request(app).get("/api/auth/google-redirect");
  expect(res.status).toBe(302);
  const state = new URL(res.headers.location).searchParams.get("state");
  const setCookie = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const cookie = setCookie.find((c) => c.startsWith("oauth_state="));
  return { state, cookie, setCookie, location: res.headers.location };
}

const callback = (query: string, cookie?: string) => {
  const req = request(app).get(`/api/auth/google-callback?${query}`);
  return cookie ? req.set("Cookie", cookie.split(";")[0]) : req;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Google OAuth state (login CSRF protection)", () => {
  it("issues a random state in a httpOnly, SameSite=Lax cookie", async () => {
    const a = await startFlow();
    const b = await startFlow();
    expect(a.state).toMatch(/^[a-f0-9]{64}$/);
    expect(a.state).not.toBe(b.state);
    expect(a.cookie).toContain("HttpOnly");
    expect(a.cookie).toContain("SameSite=Lax");
    expect(a.cookie).toContain(`oauth_state=${a.state}`);
  });

  it("rejects a callback with no state and never calls Google", async () => {
    const spy = mockGoogle({ email: "csrf@example.com" });
    const { cookie } = await startFlow();
    const res = await callback("code=abc", cookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${FRONTEND}/login?error=oauth_failed`);
    expect(spy).not.toHaveBeenCalled();
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a callback with no state cookie", async () => {
    const spy = mockGoogle({ email: "csrf@example.com" });
    const { state } = await startFlow();
    const res = await callback(`code=abc&state=${state}`);
    expect(res.headers.location).toBe(`${FRONTEND}/login?error=oauth_failed`);
    expect(spy).not.toHaveBeenCalled();
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a callback whose state does not match the cookie", async () => {
    const spy = mockGoogle({ email: "csrf@example.com" });
    const { cookie } = await startFlow();
    const other = await startFlow();
    const res = await callback(`code=abc&state=${other.state}`, cookie);
    expect(res.headers.location).toBe(`${FRONTEND}/login?error=oauth_failed`);
    expect(spy).not.toHaveBeenCalled();
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("Google OAuth account rules", () => {
  async function signIn(profile: Parameters<typeof mockGoogle>[0]) {
    mockGoogle(profile);
    const { state, cookie } = await startFlow();
    return callback(`code=abc&state=${state}`, cookie);
  }

  it("signs a new verified Google user in and clears the state cookie", async () => {
    const res = await signIn({ email: "new@example.com" });
    expect(res.headers.location.startsWith(`${FRONTEND}/auth-callback?code=`)).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.com" } });
    expect(user.emailVerified).toBe(true);
    expect(user.signInMethod).toBe("GOOGLE");
    const cleared = ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("oauth_state="));
    expect(cleared).toMatch(/oauth_state=;/);
  });

  it("rejects a Google account whose email Google has not verified", async () => {
    const res = await signIn({ email: "unverified@example.com", verified_email: false });
    expect(res.headers.location).toBe(`${FRONTEND}/login?error=email_not_verified`);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.oAuthSession.count()).toBe(0);
  });

  it("refuses to link to an existing local account whose email is unverified", async () => {
    await createUser(null, "OWNER", { email: "local@example.com", emailVerified: false });
    const res = await signIn({ email: "local@example.com" });
    expect(res.headers.location).toBe(`${FRONTEND}/login?error=account_unverified`);
    expect(await prisma.oAuthSession.count()).toBe(0);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: "local@example.com" } })).emailVerified).toBe(false);
  });

  it("links to an existing verified account", async () => {
    await createUser(null, "OWNER", { email: "linked@example.com", emailVerified: true });
    const res = await signIn({ email: "linked@example.com" });
    expect(res.headers.location).toContain("/auth-callback?code=");
    expect(await prisma.user.count()).toBe(1);
  });

  it("refuses a deactivated account", async () => {
    await createUser(null, "OWNER", { email: "off@example.com", isActive: false });
    const res = await signIn({ email: "off@example.com" });
    expect(res.headers.location).toBe(`${FRONTEND}/login?error=account_restricted`);
    expect(await prisma.oAuthSession.count()).toBe(0);
  });
});

describe("Google-issued sessions can be revoked", () => {
  async function googleSession(email: string) {
    mockGoogle({ email });
    const { state, cookie } = await startFlow();
    const res = await callback(`code=abc&state=${state}`, cookie);
    const code = new URL(res.headers.location).searchParams.get("code");
    const exchange = await request(app).get(`/api/auth/oauth-exchange/${code}`);
    expect(exchange.status).toBe(200);
    // The refresh token travels only in an httpOnly cookie, never in the response body.
    expect(exchange.body.refreshToken).toBeUndefined();
    return { token: exchange.body.token as string, cookie: cookiePair(exchange) };
  }

  it("refreshes while the session is current", async () => {
    const { cookie } = await googleSession("fresh@example.com");
    expect(cookie).toBeDefined();
    const res = await refresh(cookie);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("rejects the refresh token and the access token after tokenVersion is bumped", async () => {
    const { token, cookie } = await googleSession("revoked@example.com");
    await prisma.user.update({ where: { email: "revoked@example.com" }, data: { tokenVersion: { increment: 1 } } });

    const refreshed = await refresh(cookie);
    expect(refreshed.status).toBe(401);
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(401);
  });

  it("a one-time code cannot be exchanged twice", async () => {
    mockGoogle({ email: "once@example.com" });
    const { state, cookie } = await startFlow();
    const res = await callback(`code=abc&state=${state}`, cookie);
    const code = new URL(res.headers.location).searchParams.get("code");
    expect((await request(app).get(`/api/auth/oauth-exchange/${code}`)).status).toBe(200);
    expect((await request(app).get(`/api/auth/oauth-exchange/${code}`)).status).toBe(400);
  });
});
