import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { REUSE_GRACE_MS } from "../src/utils/session";
import { createOrganization, createUser } from "./helpers/factories";
import { cookiePair, logout, refresh, setCookieHeader } from "./helpers/session";

const PASSWORD = "Str0ng!Passw0rd";

async function loginAs(overrides: Parameters<typeof createUser>[2] = {}) {
  const org = await createOrganization();
  const hash = await bcrypt.hash(PASSWORD, 4);
  const user = await createUser(org.id, "OWNER", { password: hash, ...overrides });
  const res = await request(app).post("/api/auth/login").send({ email: user.email, password: PASSWORD });
  expect(res.status).toBe(200);
  return { user, res, token: res.body.token as string, cookie: cookiePair(res) as string };
}

const me = (token: string) => request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

describe("login issues a short lived access token and an httpOnly refresh cookie", () => {
  it("returns the access token in the body and the refresh token only as a cookie", async () => {
    const { res, cookie } = await loginAs();
    expect(res.body.refreshToken).toBeUndefined();
    expect(cookie).toMatch(/^traqify_rt=[a-f0-9]{64}$/);

    const header = setCookieHeader(res) as string;
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Path=/api/auth");
    expect(header).toContain("SameSite=Lax");
    expect(header).toMatch(/Max-Age=2592000/);
  });

  it("stores only a hash of the refresh token", async () => {
    const { cookie } = await loginAs();
    const raw = cookie.split("=")[1];
    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("makes the access token valid for about fifteen minutes", async () => {
    const { token } = await loginAs();
    const { iat, exp } = jwt.decode(token) as { iat: number; exp: number };
    expect(exp - iat).toBe(15 * 60);
  });
});

describe("access token verification", () => {
  it("accepts a fresh token", async () => {
    const { token } = await loginAs();
    expect((await me(token)).status).toBe(200);
  });

  it("refuses an expired access token", async () => {
    const { user } = await loginAs();
    const expired = jwt.sign({ userId: user.id, email: user.email, tokenVersion: 0 }, process.env.JWT_SECRET!, { algorithm: "HS256", expiresIn: -10 });
    expect((await me(expired)).status).toBe(401);
  });

  it("refuses a token signed with another secret", async () => {
    const { user } = await loginAs();
    const forged = jwt.sign({ userId: user.id, email: user.email, tokenVersion: 0 }, "some-other-secret", { algorithm: "HS256" });
    expect((await me(forged)).status).toBe(401);
  });

  it("refuses a token signed with a different algorithm, even with the right secret", async () => {
    const { user } = await loginAs();
    const hs512 = jwt.sign({ userId: user.id, email: user.email, tokenVersion: 0 }, process.env.JWT_SECRET!, { algorithm: "HS512" });
    expect((await me(hs512)).status).toBe(401);
  });

  it("refuses an unsigned token (alg none)", async () => {
    const { user } = await loginAs();
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({ alg: "none", typ: "JWT" })}.${encode({ userId: user.id, email: user.email, tokenVersion: 0 })}.`;
    expect((await me(unsigned)).status).toBe(401);
  });

  it("refuses an old token after tokenVersion changes", async () => {
    const { user, token } = await loginAs();
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
    expect((await me(token)).status).toBe(401);
  });

  it("does not accept an email verification proof as an access token", async () => {
    const { signEmailVerificationToken } = await import("../src/utils/jwt");
    expect((await me(signEmailVerificationToken("a@example.com"))).status).toBe(401);
  });
});

describe("refresh rotation", () => {
  it("issues a new access token and a different refresh cookie", async () => {
    const { cookie } = await loginAs();
    const res = await refresh(cookie);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect((await me(res.body.token)).status).toBe(200);

    const next = cookiePair(res);
    expect(next).toBeDefined();
    expect(next).not.toBe(cookie);
    expect(res.body.refreshToken).toBeUndefined();
  });

  it("keeps the same session family across rotations", async () => {
    const { cookie } = await loginAs();
    const second = await refresh(cookie);
    await refresh(cookiePair(second));
    const families = await prisma.refreshToken.findMany({ select: { familyId: true } });
    expect(new Set(families.map((f) => f.familyId)).size).toBe(1);
    expect(families).toHaveLength(3);
  });

  it("refuses a missing, malformed or unknown cookie", async () => {
    expect((await refresh(undefined)).status).toBe(401);
    expect((await refresh("traqify_rt=")).status).toBe(401);
    expect((await refresh("traqify_rt=not-a-real-token")).status).toBe(401);
  });

  it("refuses an expired refresh token", async () => {
    const { cookie } = await loginAs();
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await refresh(cookie)).status).toBe(401);
  });

  it("refuses a refresh token for a deactivated user", async () => {
    const { user, cookie } = await loginAs();
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    expect((await refresh(cookie)).status).toBe(401);
  });

  it("refuses refresh tokens issued before a password change", async () => {
    const { user, token, cookie } = await loginAs();
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: "An0ther!Passw0rd" });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).tokenVersion).toBe(1);
    expect((await refresh(cookie)).status).toBe(401);
  });
});

describe("refresh token reuse detection", () => {
  it("revokes the session when a rotated token is presented again", async () => {
    const { user, token, cookie: first } = await loginAs();
    const second = await refresh(first);
    expect(second.status).toBe(200);
    const successor = cookiePair(second) as string;
    // Pretend the legitimate rotation happened a while ago, so replay is not a concurrent request.
    await prisma.refreshToken.updateMany({ where: { usedAt: { not: null } }, data: { usedAt: new Date(Date.now() - REUSE_GRACE_MS - 5000) } });

    const replay = await refresh(first);

    expect(replay.status).toBe(401);
    expect(replay.body.error).toMatch(/revoked/i);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).tokenVersion).toBe(1);
    expect(await prisma.refreshToken.count()).toBe(0);
    expect((await refresh(successor)).status).toBe(401);
    expect((await me(token)).status).toBe(401);
    expect((await me(second.body.token)).status).toBe(401);
  });

  it("does not treat two near simultaneous refreshes as theft", async () => {
    const { user, cookie } = await loginAs();
    const first = await refresh(cookie);
    const concurrent = await refresh(cookie);

    expect(first.status).toBe(200);
    expect(concurrent.status).toBe(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).tokenVersion).toBe(0);
    expect((await refresh(cookiePair(first))).status).toBe(200);
  });

  it("lets only one of two truly parallel refreshes win", async () => {
    const { cookie } = await loginAs();
    const results = await Promise.all([refresh(cookie), refresh(cookie)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });
});

describe("CSRF protection on cookie authenticated endpoints", () => {
  it("accepts the web app's origin with the custom header", async () => {
    const { cookie } = await loginAs();
    expect((await refresh(cookie)).status).toBe(200);
  });

  it("rejects a foreign origin", async () => {
    const { cookie } = await loginAs();
    const res = await refresh(cookie, { Origin: "https://evil.example.com" });
    expect(res.status).toBe(403);
    expect(await prisma.refreshToken.count({ where: { usedAt: { not: null } } })).toBe(0);
  });

  it("rejects a request without the custom header", async () => {
    const { cookie } = await loginAs();
    expect((await refresh(cookie, { "X-Requested-By": null })).status).toBe(403);
    expect((await refresh(cookie, { "X-Requested-By": "something-else" })).status).toBe(403);
  });

  it("rejects a request with neither Origin nor Referer", async () => {
    const { cookie } = await loginAs();
    expect((await refresh(cookie, { Origin: null })).status).toBe(403);
  });

  it("falls back to the Referer when there is no Origin", async () => {
    const { cookie } = await loginAs();
    expect((await refresh(cookie, { Origin: null, Referer: "http://localhost:3000/dashboard" })).status).toBe(200);
    expect((await refresh(cookiePair(await refresh(cookie, { Origin: null, Referer: "http://localhost:3000/x" })) ?? cookie, { Origin: null, Referer: "https://evil.example.com/x" })).status).toBe(403);
  });

  it("applies to logout as well", async () => {
    const { cookie, token } = await loginAs();
    expect((await logout(cookie, token, { Origin: "https://evil.example.com" })).status).toBe(403);
    expect((await me(token)).status).toBe(200);
  });
});

describe("logout", () => {
  it("clears the cookie, ends the session and invalidates the access token", async () => {
    const { token, cookie } = await loginAs();
    const res = await logout(cookie, token);
    expect(res.status).toBe(200);
    expect(setCookieHeader(res)).toMatch(/traqify_rt=;/);
    expect((await refresh(cookie)).status).toBe(401);
    expect((await me(token)).status).toBe(401);
    expect(await prisma.refreshToken.count()).toBe(0);
  });

  it("still ends the session when the access token has already expired", async () => {
    const { user, cookie } = await loginAs();
    const expired = jwt.sign({ userId: user.id, email: user.email, tokenVersion: 0 }, process.env.JWT_SECRET!, { algorithm: "HS256", expiresIn: -10 });
    const res = await logout(cookie, expired);
    expect(res.status).toBe(200);
    expect((await refresh(cookie)).status).toBe(401);
  });

  it("succeeds with no session at all", async () => {
    expect((await logout(undefined)).status).toBe(200);
  });
});

describe("other sign in paths start the same kind of session", () => {
  it("register sets the cookie and keeps the refresh token out of the body", async () => {
    const { signEmailVerificationToken } = await import("../src/utils/jwt");
    const email = "new@example.com";
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: PASSWORD, name: "New User", emailVerificationToken: signEmailVerificationToken(email) });
    expect(res.status).toBe(201);
    expect(res.body.refreshToken).toBeUndefined();
    expect(cookiePair(res)).toBeDefined();
    expect((await refresh(cookiePair(res))).status).toBe(200);
  });
});
