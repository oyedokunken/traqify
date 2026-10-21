import bcrypt from "bcryptjs";
import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { authed, createOrganization, createUser } from "./helpers/factories";
import { lastOtpFor } from "./helpers/mail";

const PASSWORD = "Str0ng!Passw0rd";

describe("welcome screen is decided by the server, not by the browser", () => {
  it("reports a new user as not having seen it, and a returning one as having seen it", async () => {
    const org = await createOrganization();
    const fresh = await createUser(org.id, "OWNER");
    const returning = await createUser(org.id, "MANAGER");
    await prisma.user.update({ where: { id: returning.id }, data: { welcomeSeenAt: new Date() } });

    expect((await authed(fresh).get("/api/auth/me")).body.welcomeSeen).toBe(false);
    expect((await authed(returning).get("/api/auth/me")).body.welcomeSeen).toBe(true);
  });

  it("records that the user has seen it, once, and keeps the first time", async () => {
    const org = await createOrganization();
    const user = await createUser(org.id, "OWNER");

    const first = await authed(user).post("/api/auth/welcome-seen");
    expect(first.status).toBe(200);
    const recorded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(recorded.welcomeSeenAt).toBeInstanceOf(Date);

    await authed(user).post("/api/auth/welcome-seen").expect(200);
    const again = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(again.welcomeSeenAt?.getTime()).toBe(recorded.welcomeSeenAt?.getTime());
    expect((await authed(user).get("/api/auth/me")).body.welcomeSeen).toBe(true);
  });

  it("only changes the signed in user's own flag", async () => {
    const org = await createOrganization();
    const actor = await createUser(org.id, "OWNER");
    const colleague = await createUser(org.id, "CASHIER");

    await authed(actor).post("/api/auth/welcome-seen").expect(200);

    expect((await prisma.user.findUniqueOrThrow({ where: { id: colleague.id } })).welcomeSeenAt).toBeNull();
  });

  it("needs a signed in user", async () => {
    expect((await request(app).post("/api/auth/welcome-seen")).status).toBe(401);
  });

  it("is the same on every device: a new login reports the flag the server holds", async () => {
    const org = await createOrganization();
    const password = await bcrypt.hash(PASSWORD, 4);
    const user = await createUser(org.id, "OWNER", { password });

    const before = await request(app).post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(before.body.user.welcomeSeen).toBe(false);

    await authed(user).post("/api/auth/welcome-seen").expect(200);

    const after = await request(app).post("/api/auth/login").send({ email: user.email, password: PASSWORD });
    expect(after.body.user.welcomeSeen).toBe(true);
  });

  it("a brand new account starts as not seen", async () => {
    const email = "welcome-new@example.com";
    await request(app).post("/api/auth/send-otp").send({ email }).expect(200);
    const proof = (await request(app).post("/api/auth/verify-email").send({ email, otp: lastOtpFor(email) })).body
      .emailVerificationToken;

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email, password: PASSWORD, name: "New Person", emailVerificationToken: proof });

    expect(res.status).toBe(201);
    expect(res.body.user.welcomeSeen).toBe(false);
  });
});
