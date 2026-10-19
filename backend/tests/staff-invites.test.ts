import fs from "fs";
import path from "path";
import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { hashToken } from "../src/utils/token-hash";
import { authed, createTenant } from "./helpers/factories";
import { sentMail } from "./helpers/mail";

const HEX64 = /^[a-f0-9]{64}$/;

async function inviteSomeone(email = "newhire@example.com") {
  const tenant = await createTenant();
  const res = await authed(tenant.manager).post("/api/staff/invite").send({ email, role: "CASHIER" });
  expect(res.status).toBe(201);
  const mail = sentMail().find((m) => m.to === email);
  const raw = mail?.html.match(/\/invite\/([a-f0-9]+)/)?.[1];
  if (!raw) throw new Error("No invitation link in the email");
  return { ...tenant, response: res, raw, email };
}

describe("invitation tokens are never exposed", () => {
  it("stores only a hash and emails the raw value", async () => {
    const { raw } = await inviteSomeone();
    const row = await prisma.staffInvite.findFirstOrThrow();
    expect(row.token).toMatch(HEX64);
    expect(row.token).not.toBe(raw);
    expect(row.token).toBe(hashToken(raw));
  });

  it("does not return the token when an invitation is created", async () => {
    const { response, raw } = await inviteSomeone();
    expect(response.body.invite.token).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(raw);
    expect(JSON.stringify(response.body)).not.toContain(hashToken(raw));
  });

  it("does not return tokens when invitations are listed", async () => {
    const { manager, raw } = await inviteSomeone();
    const res = await authed(manager).get("/api/staff/invites");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(raw);
    expect(JSON.stringify(res.body)).not.toContain(hashToken(raw));
  });

  it("accepts the emailed link but not the stored hash", async () => {
    const { raw, email } = await inviteSomeone();
    const stored = (await prisma.staffInvite.findFirstOrThrow()).token;

    expect((await request(app).get(`/api/staff/invite/${stored}`)).status).toBe(400);
    expect((await request(app).post("/api/auth/accept-invite").send({ token: stored, name: "Mallory", password: "Str0ng!Passw0rd" })).status).toBe(400);
    expect(await prisma.user.count({ where: { email } })).toBe(0);

    expect((await request(app).get(`/api/staff/invite/${raw}`)).status).toBe(200);
    const accepted = await request(app).post("/api/auth/accept-invite").send({ token: raw, name: "New Hire", password: "Str0ng!Passw0rd" });
    expect(accepted.status).toBe(201);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });
});

describe("the migration that hashes existing invitations", () => {
  it("keeps links that were emailed before the change working", async () => {
    const { org, owner } = await createTenant();
    const legacyToken = "a".repeat(64);
    await prisma.staffInvite.create({
      data: { email: "legacy@example.com", role: "MANAGER", token: legacyToken, expiresAt: new Date(Date.now() + 86_400_000), organizationId: org.id, invitedById: owner.id },
    });
    expect((await request(app).get(`/api/staff/invite/${legacyToken}`)).status).toBe(400);

    const sql = fs.readFileSync(path.join(__dirname, "../prisma/migrations/20261019000000_hash_staff_invite_tokens/migration.sql"), "utf8");
    await prisma.$executeRawUnsafe(sql.split("\n").filter((l) => !l.startsWith("--")).join("\n"));

    expect((await prisma.staffInvite.findFirstOrThrow()).token).toBe(hashToken(legacyToken));
    expect((await request(app).get(`/api/staff/invite/${legacyToken}`)).status).toBe(200);
  });
});
