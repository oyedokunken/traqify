import bcrypt from "bcryptjs";
import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { authed, createOrganization, createTenant, createUser } from "./helpers/factories";
import { sentMail } from "./helpers/mail";
import { hashToken } from "../src/utils/token-hash";
import { cookiePair, refresh } from "./helpers/session";

const PASSWORD = "Str0ng!Passw0rd";
const NEW_PASSWORD = "An0ther!Passw0rd";

async function createLoginUser(overrides: Parameters<typeof createUser>[2] = {}) {
  const org = await createOrganization();
  const password = await bcrypt.hash(PASSWORD, 4);
  return createUser(org.id, "OWNER", { password, ...overrides });
}

const login = (email: string, password: string) => request(app).post("/api/auth/login").send({ email, password });

/** Pulls the reset token out of the most recent reset email for an address. */
function resetTokenFor(email: string): string {
  const mail = sentMail().reverse().find((m) => m.to === email && /reset/i.test(m.subject));
  const match = mail?.html.match(/reset-password\?token=([a-f0-9]+)/);
  if (!match) throw new Error("No reset link found in the email");
  return match[1];
}

describe("login", () => {
  it("rejects a wrong password and an unknown account with the same message", async () => {
    const user = await createLoginUser();
    const wrong = await login(user.email, "Wrong!Passw0rd1");
    const unknown = await login("nobody@example.com", PASSWORD);
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  it("points Google accounts at Google sign-in", async () => {
    const user = await createLoginUser({ password: null });
    const res = await login(user.email, PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body.isGoogleAccount).toBe(true);
  });

  it("refuses a deactivated account", async () => {
    const user = await createLoginUser({ isActive: false });
    expect((await login(user.email, PASSWORD)).status).toBe(403);
  });

  it("asks an unverified account to verify and sends a code", async () => {
    const user = await createLoginUser({ emailVerified: false });
    const res = await login(user.email, PASSWORD);
    expect(res.status).toBe(403);
    expect(res.body.requiresVerification).toBe(true);
    expect(sentMail().some((m) => m.to === user.email)).toBe(true);
  });

  it("validates the request body", async () => {
    expect((await request(app).post("/api/auth/login").send({ email: "nope", password: "x" })).status).toBe(400);
    expect((await request(app).post("/api/auth/login").send({})).status).toBe(400);
  });
});

describe("forgot password", () => {
  it("answers the same for known and unknown addresses and only mails known ones", async () => {
    const user = await createLoginUser();
    const known = await request(app).post("/api/auth/forgot-password").send({ email: user.email });
    const unknown = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(sentMail().some((m) => m.to === user.email)).toBe(true);
    expect(sentMail().some((m) => m.to === "nobody@example.com")).toBe(false);
  });

  it("stores only a hash of the reset token", async () => {
    const user = await createLoginUser();
    await request(app).post("/api/auth/forgot-password").send({ email: user.email }).expect(200);
    const token = resetTokenFor(user.email);
    const row = await prisma.passwordResetToken.findFirstOrThrow({ where: { email: user.email } });
    expect(row.token).not.toBe(token);
    expect(row.token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a malformed address", async () => {
    expect((await request(app).post("/api/auth/forgot-password").send({ email: "nope" })).status).toBe(400);
  });

  describe("rate limits", () => {
    beforeEach(() => { process.env.RATE_LIMIT_ENABLED = "true"; });
    afterEach(() => { delete process.env.RATE_LIMIT_ENABLED; });
    const forgot = (email: string, ip: string) => request(app).post("/api/auth/forgot-password").set("X-Forwarded-For", ip).send({ email });

    it("limits requests per email regardless of IP", async () => {
      for (let i = 1; i <= 3; i++) expect((await forgot("target@example.com", `10.1.1.${i}`)).status).toBe(200);
      expect((await forgot("target@example.com", "10.1.1.99")).status).toBe(429);
    });

    it("limits requests per IP across addresses", async () => {
      for (let i = 1; i <= 10; i++) expect((await forgot(`user${i}@example.com`, "10.1.2.1")).status).toBe(200);
      expect((await forgot("user11@example.com", "10.1.2.1")).status).toBe(429);
    });
  });
});

describe("reset password", () => {
  async function requestReset(email: string) {
    await request(app).post("/api/auth/forgot-password").send({ email }).expect(200);
    return resetTokenFor(email);
  }

  it("sets the new password, ends every session and burns the token", async () => {
    const user = await createLoginUser();
    const session = await login(user.email, PASSWORD);
    const cookie = cookiePair(session) as string;
    const oldAccess = session.body.token as string;
    const token = await requestReset(user.email);

    const res = await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect((await login(user.email, NEW_PASSWORD)).status).toBe(200);
    expect((await login(user.email, PASSWORD)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${oldAccess}`)).status).toBe(401);
    expect((await refresh(cookie)).status).toBe(401);
    expect((await request(app).post("/api/auth/reset-password").send({ token, password: "Third!Passw0rd1" })).status).toBe(400);
  });

  it("lets a Google-only account set a password", async () => {
    const user = await createLoginUser({ password: null });
    const token = await requestReset(user.email);
    expect((await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD })).status).toBe(200);
    expect((await login(user.email, NEW_PASSWORD)).status).toBe(200);
  });

  it("rejects unknown, expired and empty tokens", async () => {
    const user = await createLoginUser();
    const token = await requestReset(user.email);
    expect((await request(app).post("/api/auth/reset-password").send({ token: "f".repeat(64), password: NEW_PASSWORD })).status).toBe(400);
    expect((await request(app).post("/api/auth/reset-password").send({ token: "", password: NEW_PASSWORD })).status).toBe(400);
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD })).status).toBe(400);
  });

  it("rejects a weak password without consuming the token", async () => {
    const user = await createLoginUser();
    const token = await requestReset(user.email);
    expect((await request(app).post("/api/auth/reset-password").send({ token, password: "weak" })).status).toBe(400);
    expect((await request(app).post("/api/auth/reset-password").send({ token, password: NEW_PASSWORD })).status).toBe(200);
  });

  it("invalidates an older link when a new one is requested", async () => {
    const user = await createLoginUser();
    const first = await requestReset(user.email);
    const second = await requestReset(user.email);
    expect((await request(app).post("/api/auth/reset-password").send({ token: first, password: NEW_PASSWORD })).status).toBe(400);
    expect((await request(app).post("/api/auth/reset-password").send({ token: second, password: NEW_PASSWORD })).status).toBe(200);
  });
});

describe("change password", () => {
  async function signedIn() {
    const user = await createLoginUser();
    const res = await login(user.email, PASSWORD);
    return { user, token: res.body.token as string, cookie: cookiePair(res) as string };
  }
  const change = (token: string, body: Record<string, unknown>) =>
    request(app).post("/api/auth/change-password").set("Authorization", `Bearer ${token}`).send(body);

  it("requires the current password", async () => {
    const { token } = await signedIn();
    expect((await change(token, { currentPassword: "Wrong!Passw0rd1", newPassword: NEW_PASSWORD })).status).toBe(400);
    expect((await change(token, { newPassword: NEW_PASSWORD })).status).toBe(400);
  });

  it("rejects a weak new password", async () => {
    const { token } = await signedIn();
    expect((await change(token, { currentPassword: PASSWORD, newPassword: "weak" })).status).toBe(400);
  });

  it("changes the password and ends other sessions", async () => {
    const { user, token, cookie } = await signedIn();
    expect((await change(token, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD })).status).toBe(200);
    expect((await login(user.email, NEW_PASSWORD)).status).toBe(200);
    expect((await refresh(cookie)).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("is refused for an account with no password", async () => {
    const user = await createLoginUser({ password: null });
    const res = await change((await import("./helpers/factories")).tokenFor(user), { currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
  });
});

describe("profile", () => {
  it("returns the signed in user's profile", async () => {
    const { owner, org } = await createTenant();
    const res = await authed(owner).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: owner.id, email: owner.email, role: "OWNER", organizationId: org.id });
    expect(res.body.password).toBeUndefined();
  });

  it("updates only the name and phone", async () => {
    const { owner, org } = await createTenant();
    const other = await createOrganization();
    const res = await authed(owner).patch("/api/auth/me").send({
      name: "New Name", phone: "0800", role: "AUDITOR", email: "evil@example.com", organizationId: other.id, isActive: false, tokenVersion: 99,
    });
    expect(res.status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(after).toMatchObject({ name: "New Name", phone: "0800", role: "OWNER", email: owner.email, organizationId: org.id, isActive: true, tokenVersion: 0 });
  });

  it("validates the name", async () => {
    const { owner } = await createTenant();
    expect((await authed(owner).patch("/api/auth/me").send({ name: "x" })).status).toBe(400);
  });
});

describe("accepting a staff invitation", () => {
  async function invite(overrides: Partial<{ email: string; role: "MANAGER" | "CASHIER" | "AUDITOR"; status: "PENDING" | "ACCEPTED" | "EXPIRED"; expiresAt: Date }> = {}) {
    const tenant = await createTenant();
    const raw = `invite-${Math.random().toString(36).slice(2)}`;
    const row = await prisma.staffInvite.create({
      data: {
        email: overrides.email ?? "newhire@example.com",
        role: overrides.role ?? "CASHIER",
        // Only the hash is stored; tests present the raw value, like an emailed link does.
        token: hashToken(raw),
        status: overrides.status ?? "PENDING",
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86_400_000),
        organizationId: tenant.org.id,
        invitedById: tenant.owner.id,
      },
    });
    return { ...tenant, invite: { ...row, token: raw } };
  }
  const accept = (token: string, body: Record<string, unknown> = {}) =>
    request(app).post("/api/auth/accept-invite").send({ token, name: "New Hire", password: PASSWORD, ...body });

  it("creates a verified staff member with the invited role and starts a session", async () => {
    const { org, owner, invite: row } = await invite({ role: "MANAGER" });
    const res = await accept(row.token);

    expect(res.status).toBe(201);
    expect(res.body.refreshToken).toBeUndefined();
    expect(cookiePair(res)).toBeDefined();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: row.email } });
    expect(user).toMatchObject({ role: "MANAGER", organizationId: org.id, emailVerified: true });
    expect((await prisma.staffInvite.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("ACCEPTED");
    expect(sentMail().some((m) => m.to === owner.email && /joined/i.test(m.subject))).toBe(true);
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${res.body.token}`)).status).toBe(200);
  });

  it("cannot be used twice, after expiry or once cancelled", async () => {
    const used = await invite();
    expect((await accept(used.invite.token)).status).toBe(201);
    expect((await accept(used.invite.token, { name: "Second Try" })).status).toBe(400);

    const expired = await invite({ email: "late@example.com", expiresAt: new Date(Date.now() - 1000) });
    expect((await accept(expired.invite.token)).status).toBe(400);

    const cancelled = await invite({ email: "gone@example.com", status: "EXPIRED" });
    expect((await accept(cancelled.invite.token)).status).toBe(400);
    expect((await accept("not-a-token")).status).toBe(400);
  });

  it("refuses when an account already exists for the invited email", async () => {
    const { invite: row } = await invite({ email: "taken@example.com" });
    await createUser(null, "OWNER", { email: "taken@example.com" });
    expect((await accept(row.token)).status).toBe(409);
  });

  it("validates the name and password", async () => {
    const { invite: row } = await invite();
    expect((await accept(row.token, { password: "weak" })).status).toBe(400);
    expect((await accept(row.token, { name: "x" })).status).toBe(400);
    expect(await prisma.user.count({ where: { email: row.email } })).toBe(0);
  });

  it("shows invitation details only for a valid invitation", async () => {
    const { invite: row, org } = await invite({ role: "AUDITOR" });
    const ok = await request(app).get(`/api/staff/invite/${row.token}`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ email: row.email, role: "AUDITOR", organizationName: org.name });
    expect((await request(app).get("/api/staff/invite/unknown")).status).toBe(400);
  });
});
