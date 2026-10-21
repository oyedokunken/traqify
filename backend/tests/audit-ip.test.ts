import bcrypt from "bcryptjs";
import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { authed, createOrganization, createTenant, createUser } from "./helpers/factories";
import { mockGoogle } from "./helpers/google";
import { sentMail } from "./helpers/mail";

const PASSWORD = "Str0ng!Passw0rd";
const IP = "203.0.113.77";
const AGENT = "audit-test-agent/1.0";

afterEach(() => {
  jest.restoreAllMocks();
});

const entriesFor = (organizationId: string, action: string) =>
  prisma.auditLog.findMany({ where: { organizationId, action }, orderBy: { createdAt: "desc" } });

describe("audit entries record where the action came from", () => {
  it("records a Google sign in as a login with the address and browser", async () => {
    const org = await createOrganization();
    const user = await createUser(org.id, "OWNER", { email: "google-audit@example.com", emailVerified: true });
    mockGoogle({ email: user.email });

    const start = await request(app).get("/api/auth/google-redirect");
    const state = new URL(start.headers.location).searchParams.get("state");
    const stateCookie = ([] as string[]).concat(start.headers["set-cookie"] ?? []).find((c) => c.startsWith("oauth_state="))!;
    const back = await request(app)
      .get(`/api/auth/google-callback?code=abc&state=${state}`)
      .set("Cookie", stateCookie.split(";")[0]);
    const code = new URL(back.headers.location).searchParams.get("code");

    const exchange = await request(app)
      .post("/api/auth/oauth-exchange")
      .set("X-Forwarded-For", IP)
      .set("User-Agent", AGENT)
      .send({ code });
    expect(exchange.status).toBe(200);

    // The entry is written after the response, so give it a moment.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const [entry] = await entriesFor(org.id, "LOGIN");
    expect(entry).toMatchObject({ userId: user.id, entity: "User", entityId: user.id, ipAddress: IP, userAgent: AGENT });
  });

  it("records an accepted invitation with the address and browser", async () => {
    const tenant = await createTenant();
    const email = "audit-invitee@example.com";
    await authed(tenant.manager).post("/api/staff/invite").send({ email, role: "CASHIER" }).expect(201);
    const raw = sentMail().find((m) => m.to === email)?.html.match(/\/invite\/([a-f0-9]+)/)?.[1];

    const res = await request(app)
      .post("/api/auth/accept-invite")
      .set("X-Forwarded-For", IP)
      .set("User-Agent", AGENT)
      .send({ token: raw, name: "Invited Person", password: PASSWORD });
    expect(res.status).toBe(201);

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { organizationId: tenant.org.id, details: { contains: "accepted invitation" } },
    });
    expect(entry).toMatchObject({ ipAddress: IP, userAgent: AGENT });
  });

  it("records a password change with the address and browser", async () => {
    const org = await createOrganization();
    const user = await createUser(org.id, "OWNER", { password: await bcrypt.hash(PASSWORD, 4) });

    const res = await authed(user)
      .post("/api/auth/change-password")
      .set("X-Forwarded-For", IP)
      .set("User-Agent", AGENT)
      .send({ currentPassword: PASSWORD, newPassword: "An0ther!Passw0rd" });
    expect(res.status).toBe(200);

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { organizationId: org.id, details: "Changed account password" },
    });
    expect(entry).toMatchObject({ userId: user.id, ipAddress: IP, userAgent: AGENT });
  });

  it("does not try to write an audit entry for an account that has no workspace yet", async () => {
    const user = await createUser(null, "OWNER", { password: await bcrypt.hash(PASSWORD, 4) });

    const res = await authed(user)
      .post("/api/auth/change-password")
      .send({ currentPassword: PASSWORD, newPassword: "An0ther!Passw0rd" });

    expect(res.status).toBe(200);
    expect(await prisma.auditLog.count({ where: { userId: user.id } })).toBe(0);
  });
});
