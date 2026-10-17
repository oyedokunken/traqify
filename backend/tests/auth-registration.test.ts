import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { createUser } from "./helpers/factories";
import { lastOtpFor, sentMail } from "./helpers/mail";

const PASSWORD = "Str0ng!Passw0rd";

async function verifyEmailAndGetProof(email: string): Promise<string> {
  await request(app).post("/api/auth/send-otp").send({ email }).expect(200);
  const res = await request(app).post("/api/auth/verify-email").send({ email, otp: lastOtpFor(email) });
  expect(res.status).toBe(200);
  expect(res.body.emailVerificationToken).toEqual(expect.any(String));
  return res.body.emailVerificationToken;
}

const register = (body: Record<string, unknown>) => request(app).post("/api/auth/register").send(body);

describe("registration requires proof of email ownership", () => {
  it("rejects registration with no verification proof and creates no user", async () => {
    const res = await register({ email: "victim@example.com", password: PASSWORD, name: "Mallory" });
    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a proof issued for a different email", async () => {
    const proof = await verifyEmailAndGetProof("mine@example.com");
    const res = await register({ email: "victim@example.com", password: PASSWORD, name: "Mallory", emailVerificationToken: proof });
    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects forged, expired and wrong-purpose proofs", async () => {
    const email = "victim@example.com";
    const forged = jwt.sign({ email, purpose: "email-verification" }, "wrong-secret", { algorithm: "HS256" });
    expect((await register({ email, password: PASSWORD, name: "M", emailVerificationToken: forged })).status).toBe(400);

    const proof = await verifyEmailAndGetProof(email);
    const expired = jwt.sign({ ...(jwt.decode(proof) as object), exp: Math.floor(Date.now() / 1000) - 10 }, "irrelevant");
    expect((await register({ email, password: PASSWORD, name: "M", emailVerificationToken: expired })).status).toBe(400);

    // An ordinary access token must not be accepted as an email proof.
    const accessToken = jwt.sign({ userId: "x", email }, process.env.JWT_SECRET!, { algorithm: "HS256" });
    expect((await register({ email, password: PASSWORD, name: "M", emailVerificationToken: accessToken })).status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it("registers a verified user after the OTP step, and the new account can log in", async () => {
    const email = "ada@example.com";
    const proof = await verifyEmailAndGetProof(email);
    const res = await register({ email, password: PASSWORD, name: "Ada Lovelace", emailVerificationToken: proof });
    expect(res.status).toBe(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerified).toBe(true);

    const login = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it("does not let a verified-email proof be used twice for the same address", async () => {
    const email = "twice@example.com";
    const proof = await verifyEmailAndGetProof(email);
    expect((await register({ email, password: PASSWORD, name: "First", emailVerificationToken: proof })).status).toBe(201);
    expect((await register({ email, password: PASSWORD, name: "Second", emailVerificationToken: proof })).status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });
});

describe("OTP behaviour", () => {
  const email = "otp@example.com";

  it("rejects a wrong code", async () => {
    await request(app).post("/api/auth/send-otp").send({ email }).expect(200);
    const res = await request(app).post("/api/auth/verify-email").send({ email, otp: "000000" });
    expect(res.status).toBe(400);
  });

  it("locks the code after five wrong attempts, even for the correct code", async () => {
    await request(app).post("/api/auth/send-otp").send({ email }).expect(200);
    const correct = lastOtpFor(email);
    const wrong = correct === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++) {
      expect((await request(app).post("/api/auth/verify-email").send({ email, otp: wrong })).status).toBe(400);
    }
    expect((await request(app).post("/api/auth/verify-email").send({ email, otp: correct })).status).toBe(400);
  });

  it("rejects an expired code", async () => {
    await request(app).post("/api/auth/send-otp").send({ email }).expect(200);
    const code = lastOtpFor(email);
    await prisma.oTPVerification.updateMany({ where: { email }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).post("/api/auth/verify-email").send({ email, otp: code })).status).toBe(400);
  });

  it("does not accept the same code twice", async () => {
    await request(app).post("/api/auth/send-otp").send({ email }).expect(200);
    const code = lastOtpFor(email);
    expect((await request(app).post("/api/auth/verify-email").send({ email, otp: code })).status).toBe(200);
    expect((await request(app).post("/api/auth/verify-email").send({ email, otp: code })).status).toBe(400);
  });

  it("stores only a hash of the code", async () => {
    await request(app).post("/api/auth/send-otp").send({ email }).expect(200);
    const record = await prisma.oTPVerification.findFirstOrThrow({ where: { email } });
    expect(record.otp).not.toBe(lastOtpFor(email));
  });

  it("verifying an existing unverified account marks it verified and issues no tokens", async () => {
    const hash = await bcrypt.hash(PASSWORD, 4);
    await createUser(null, "OWNER", { email, emailVerified: false, password: hash });

    const loginBefore = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
    expect(loginBefore.status).toBe(403);
    expect(loginBefore.body.requiresVerification).toBe(true);

    const res = await request(app).post("/api/auth/verify-email").send({ email, otp: lastOtpFor(email) });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(res.body.refreshToken).toBeUndefined();
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true);

    expect((await request(app).post("/api/auth/login").send({ email, password: PASSWORD })).status).toBe(200);
  });

  it("does not send mail to an address that already has a verified account, but answers identically", async () => {
    await createUser(null, "OWNER", { email: "taken@example.com", emailVerified: true });
    const existing = await request(app).post("/api/auth/send-otp").send({ email: "taken@example.com" });
    const fresh = await request(app).post("/api/auth/send-otp").send({ email: "fresh@example.com" });
    expect(existing.status).toBe(200);
    expect(existing.body).toEqual(fresh.body);
    expect(sentMail().some((m) => m.to === "taken@example.com")).toBe(false);
    expect(sentMail().some((m) => m.to === "fresh@example.com")).toBe(true);
  });

  it("rejects malformed addresses", async () => {
    expect((await request(app).post("/api/auth/send-otp").send({ email: "nope" })).status).toBe(400);
    expect((await request(app).post("/api/auth/send-otp").send({})).status).toBe(400);
  });
});

describe("OTP rate limits", () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_ENABLED = "true";
  });
  afterEach(() => {
    delete process.env.RATE_LIMIT_ENABLED;
  });

  const send = (email: string, ip: string) =>
    request(app).post("/api/auth/send-otp").set("X-Forwarded-For", ip).send({ email });
  const verify = (email: string, ip: string) =>
    request(app).post("/api/auth/verify-email").set("X-Forwarded-For", ip).send({ email, otp: "000000" });

  it("limits send-otp per email regardless of the caller's IP", async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await send("spam-target@example.com", `10.0.1.${i}`)).status).toBe(200);
    }
    const blocked = await send("spam-target@example.com", "10.0.1.99");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toEqual(expect.any(String));
    expect(sentMail().filter((m) => m.to === "spam-target@example.com")).toHaveLength(5);
  });

  it("limits send-otp per IP across different addresses", async () => {
    for (let i = 1; i <= 10; i++) {
      expect((await send(`bulk${i}@example.com`, "10.0.2.1")).status).toBe(200);
    }
    expect((await send("bulk11@example.com", "10.0.2.1")).status).toBe(429);
    expect((await send("bulk12@example.com", "10.0.2.2")).status).toBe(200);
  });

  it("limits verify-email per email regardless of the caller's IP", async () => {
    for (let i = 1; i <= 10; i++) {
      expect((await verify("guess-target@example.com", `10.0.3.${i}`)).status).toBe(400);
    }
    expect((await verify("guess-target@example.com", "10.0.3.99")).status).toBe(429);
  });

  it("limits verify-email per IP across different addresses", async () => {
    for (let i = 1; i <= 15; i++) {
      expect((await verify(`g${i}@example.com`, "10.0.4.1")).status).toBe(400);
    }
    expect((await verify("g16@example.com", "10.0.4.1")).status).toBe(429);
  });

  it("treats address case variants as the same email", async () => {
    for (let i = 1; i <= 5; i++) {
      await send("Case.Target@Example.com", `10.0.5.${i}`);
    }
    expect((await send("case.target@example.com", "10.0.5.99")).status).toBe(429);
  });
});
