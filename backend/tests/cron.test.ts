import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { removeStoredObject } from "../src/config/supabase";
import { sendEmail } from "../src/config/email";
import { hashToken } from "../src/utils/token-hash";
import { createOrganization, createProduct, createTenant, createUser } from "./helpers/factories";
import { sentMail } from "./helpers/mail";
import { mockPaystack } from "./helpers/paystack";

// Storage is an external boundary: nothing in these tests talks to Supabase.
jest.mock("../src/config/supabase", () => ({
  removeStoredObject: jest.fn().mockResolvedValue(undefined),
}));
const mockedRemove = removeStoredObject as jest.Mock;

const SECRET = "test_only_not_a_secret_cron";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);
const ahead = (ms: number) => new Date(Date.now() + ms);

const housekeeping = () => request(app).get("/api/cron/housekeeping").set("Authorization", `Bearer ${SECRET}`);
const reminders = () => request(app).get("/api/cron/wishlist-reminders").set("Authorization", `Bearer ${SECRET}`);

afterEach(() => {
  jest.restoreAllMocks();
  (sendEmail as jest.Mock).mockReset().mockResolvedValue(undefined);
  mockedRemove.mockReset().mockResolvedValue(undefined);
});

describe("cron endpoints are only for the scheduler", () => {
  it.each(["/api/cron/housekeeping", "/api/cron/wishlist-reminders"])("%s refuses callers without the secret", async (path) => {
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set("Authorization", "Bearer wrong")).status).toBe(401);
    expect((await request(app).get(path).set("Authorization", SECRET)).status).toBe(401);
    expect((await request(app).get(path).set("Authorization", `Bearer ${SECRET}x`)).status).toBe(401);
  });

  it("refuses everyone when no secret is configured, even with an empty bearer", async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      expect((await request(app).get("/api/cron/housekeeping").set("Authorization", "Bearer ")).status).toBe(401);
      expect((await request(app).get("/api/cron/housekeeping").set("Authorization", "Bearer undefined")).status).toBe(401);
    } finally {
      process.env.CRON_SECRET = saved;
    }
  });

  it("accepts the secret", async () => {
    expect((await housekeeping()).status).toBe(200);
    expect((await reminders()).status).toBe(200);
  });

  it("no longer has the separate ping route, since housekeeping touches the database daily", async () => {
    expect((await request(app).get("/api/cron/ping").set("Authorization", `Bearer ${SECRET}`)).status).toBe(404);
  });
});

describe("housekeeping removes what has expired", () => {
  it("deletes expired codes and sessions and keeps live ones", async () => {
    const org = await createOrganization();
    const user = await createUser(org.id, "OWNER");
    await prisma.oTPVerification.createMany({
      data: [
        { email: "old-otp@example.com", otp: "x", expiresAt: ago(2 * DAY) },
        { email: "live-otp@example.com", otp: "x", expiresAt: ahead(HOUR) },
      ],
    });
    await prisma.passwordResetToken.createMany({
      data: [
        { email: "a@example.com", token: "old-reset", expiresAt: ago(2 * DAY) },
        { email: "b@example.com", token: "live-reset", expiresAt: ahead(HOUR) },
      ],
    });
    await prisma.oAuthSession.createMany({
      data: [
        { code: "old-code", expiresAt: ago(HOUR) },
        { code: "live-code", expiresAt: ahead(HOUR) },
      ],
    });
    await prisma.refreshToken.createMany({
      data: [
        { tokenHash: "old-hash", familyId: "f1", tokenVersion: 0, expiresAt: ago(HOUR), userId: user.id },
        { tokenHash: "live-hash", familyId: "f2", tokenVersion: 0, expiresAt: ahead(DAY), userId: user.id },
      ],
    });

    const res = await housekeeping();

    expect(res.status).toBe(200);
    expect((await prisma.oTPVerification.findMany()).map((r) => r.email)).toEqual(["live-otp@example.com"]);
    expect((await prisma.passwordResetToken.findMany()).map((r) => r.token)).toEqual(["live-reset"]);
    expect((await prisma.oAuthSession.findMany()).map((r) => r.code)).toEqual(["live-code"]);
    expect((await prisma.refreshToken.findMany()).map((r) => r.tokenHash)).toEqual(["live-hash"]);
  });

  it("marks overdue pending invitations expired without touching accepted or current ones", async () => {
    const { org, owner } = await createTenant();
    const invite = (email: string, status: "PENDING" | "ACCEPTED", expiresAt: Date) =>
      prisma.staffInvite.create({ data: { email, role: "CASHIER", token: hashToken(email), status, expiresAt, organizationId: org.id, invitedById: owner.id } });
    await invite("overdue@example.com", "PENDING", ago(HOUR));
    await invite("current@example.com", "PENDING", ahead(DAY));
    await invite("accepted@example.com", "ACCEPTED", ago(DAY));

    await housekeeping();

    const status = Object.fromEntries((await prisma.staffInvite.findMany()).map((i) => [i.email, i.status]));
    expect(status).toEqual({ "overdue@example.com": "EXPIRED", "current@example.com": "PENDING", "accepted@example.com": "ACCEPTED" });
  });

  it("removes abandoned uploads and their stored files, and carries on if one removal fails", async () => {
    const org = await createOrganization();
    const user = await createUser(org.id, "OWNER");
    const upload = (path: string, status: "PENDING" | "CONFIRMED", expiresAt: Date) =>
      prisma.upload.create({
        data: { bucket: "avatars", path, purpose: "AVATAR", status, declaredType: "image/png", maxBytes: 1000, expiresAt, userId: user.id, organizationId: org.id },
      });
    await upload("abandoned-1", "PENDING", ago(2 * DAY));
    await upload("abandoned-2", "PENDING", ago(2 * DAY));
    await upload("recent", "PENDING", ago(HOUR));
    await upload("confirmed", "CONFIRMED", ago(2 * DAY));
    mockedRemove.mockImplementation(async (_bucket: string, path: string) => {
      if (path === "abandoned-1") throw new Error("storage down");
    });

    const res = await housekeeping();

    expect(res.status).toBe(200);
    const left = (await prisma.upload.findMany()).map((u) => u.path).sort();
    // The one whose file could not be removed stays so the next run tries again; no orphan is forgotten.
    expect(left).toEqual(["abandoned-1", "confirmed", "recent"]);
    expect(mockedRemove).toHaveBeenCalledWith("avatars", "abandoned-2");
  });

  it("answers with counts only", async () => {
    const res = await housekeeping();
    expect(Object.keys(res.body).sort()).toEqual(["checkouts", "deleted", "invitesExpired", "uploadsRemoved"]);
    expect(JSON.stringify(res.body)).not.toMatch(/error|stack|detail/i);
  });
});

describe("housekeeping settles checkouts that were abandoned", () => {
  async function sessionFor(options: { reference: string; expiredFor: number; qty?: number; stock?: number }) {
    const { org, owner } = await createTenant();
    const product = await createProduct(org.id, { price: 1000, stock: options.stock ?? 5 });
    const qty = options.qty ?? 1;
    const session = await prisma.checkoutSession.create({
      data: {
        reference: options.reference,
        customerName: "Buyer",
        customerEmail: "buyer@example.com",
        items: [{ productId: product.id, quantity: qty }],
        amountKobo: 1000 * qty * 100,
        expiresAt: ago(options.expiredFor),
        organizationId: org.id,
      },
    });
    return { org, owner, product, session };
  }
  const statusOf = async (reference: string) => (await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } })).status;

  it("expires a checkout Paystack says was abandoned, failed, or never started", async () => {
    await sessionFor({ reference: "ref-abandoned", expiredFor: 2 * HOUR });
    await sessionFor({ reference: "ref-failed", expiredFor: 2 * HOUR });
    await sessionFor({ reference: "ref-unknown", expiredFor: 2 * HOUR });
    mockPaystack({
      transactions: {
        "ref-abandoned": { status: "abandoned", amount: 100000, currency: "NGN" },
        "ref-failed": { status: "failed", amount: 100000, currency: "NGN" },
      },
    });

    const res = await housekeeping();

    expect(res.body.checkouts).toMatchObject({ expired: 3, fulfilled: 0, deferred: 0 });
    for (const reference of ["ref-abandoned", "ref-failed", "ref-unknown"]) expect(await statusOf(reference)).toBe("EXPIRED");
  });

  it("gives the customer the order when they paid but never came back", async () => {
    const { org, product } = await sessionFor({ reference: "ref-paid", expiredFor: 2 * HOUR, qty: 2 });
    mockPaystack({ transactions: { "ref-paid": { status: "success", amount: 200000, currency: "NGN" } } });

    const res = await housekeeping();

    expect(res.body.checkouts).toMatchObject({ fulfilled: 1, expired: 0 });
    const session = await prisma.checkoutSession.findUniqueOrThrow({ where: { reference: "ref-paid" } });
    expect(session.status).toBe("COMPLETED");
    expect(session.orderId).not.toBeNull();
    expect(await prisma.payment.count({ where: { organizationId: org.id, reference: "ref-paid", status: "COMPLETED" } })).toBe(1);
    expect((await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } })).quantity).toBe(3);
  });

  it("refunds a paid checkout that can no longer be fulfilled", async () => {
    await sessionFor({ reference: "ref-nostock", expiredFor: 2 * HOUR, qty: 2, stock: 1 });
    const paystack = mockPaystack({ transactions: { "ref-nostock": { status: "success", amount: 200000, currency: "NGN" } } });

    const res = await housekeeping();

    expect(res.status).toBe(200);
    expect(res.body.checkouts).toMatchObject({ refunded: 1 });
    expect(paystack.calls.refund).toHaveLength(1);
    expect(await statusOf("ref-nostock")).toBe("REFUNDED");
  });

  it("changes nothing when Paystack cannot be reached, so an outage is never read as a failed payment", async () => {
    await sessionFor({ reference: "ref-outage", expiredFor: 2 * HOUR });
    mockPaystack({ verifyThrows: true });

    const res = await housekeeping();

    expect(res.status).toBe(200);
    expect(res.body.checkouts).toMatchObject({ deferred: 1, expired: 0, fulfilled: 0 });
    expect(await statusOf("ref-outage")).toBe("PENDING");
  });

  it("leaves a checkout alone while the customer could still be paying", async () => {
    await sessionFor({ reference: "ref-fresh", expiredFor: 10 * 60 * 1000 });
    const paystack = mockPaystack();

    await housekeeping();

    expect(paystack.calls.verify).toEqual([]);
    expect(await statusOf("ref-fresh")).toBe("PENDING");
  });

  it("waits a day before giving up on a transaction Paystack still lists as in progress", async () => {
    await sessionFor({ reference: "ref-ongoing-recent", expiredFor: 2 * HOUR });
    await sessionFor({ reference: "ref-ongoing-old", expiredFor: 25 * HOUR });
    mockPaystack({
      transactions: {
        "ref-ongoing-recent": { status: "ongoing", amount: 100000, currency: "NGN" },
        "ref-ongoing-old": { status: "ongoing", amount: 100000, currency: "NGN" },
      },
    });

    await housekeeping();

    expect(await statusOf("ref-ongoing-recent")).toBe("PENDING");
    expect(await statusOf("ref-ongoing-old")).toBe("EXPIRED");
  });

  it("does not expire a session whose payment succeeded for a different amount", async () => {
    await sessionFor({ reference: "ref-mismatch", expiredFor: 2 * HOUR });
    mockPaystack({ transactions: { "ref-mismatch": { status: "success", amount: 5, currency: "NGN" } } });

    await housekeeping();

    // A paid transaction that does not match is a case for a person, not for automatic expiry.
    expect(await statusOf("ref-mismatch")).toBe("PENDING");
  });

  it("still completes a checkout the customer pays after it was marked expired", async () => {
    const { org, owner } = await sessionFor({ reference: "ref-late", expiredFor: 2 * HOUR });
    const paystack = mockPaystack({ transactions: { "ref-late": { status: "abandoned", amount: 100000, currency: "NGN" } } });
    await housekeeping();
    expect(await statusOf("ref-late")).toBe("EXPIRED");

    paystack.setTransaction("ref-late", { status: "success", amount: 100000, currency: "NGN" });
    const res = await request(app).post(`/api/store/${org.slug}/checkout`).send({ paymentMethod: "PAYSTACK", reference: "ref-late" });

    expect(owner.id).toBeDefined();
    expect(res.status).toBe(201);
    expect(await statusOf("ref-late")).toBe("COMPLETED");
  });
});

describe("wishlist reminders", () => {
  async function wishlistFor(options: { createdAgo: number; email?: string | null; flags?: Partial<Record<"sent30min" | "sent2hr" | "sentDay1" | "sentDay3", boolean>> }) {
    const { org } = await createTenant();
    const product = await createProduct(org.id);
    return prisma.wishlist.create({
      data: {
        sessionId: `s-${Math.random().toString(36).slice(2)}`,
        email: options.email === undefined ? "shopper@example.com" : options.email,
        productIds: [product.id],
        slug: org.slug,
        organizationId: org.id,
        createdAt: ago(options.createdAgo),
        ...options.flags,
      },
    });
  }
  const flagsOf = async (id: string) => {
    const w = await prisma.wishlist.findUniqueOrThrow({ where: { id } });
    return { sent30min: w.sent30min, sent2hr: w.sent2hr, sentDay1: w.sentDay1, sentDay3: w.sentDay3 };
  };
  const remindersSent = () => sentMail().filter((m) => /wishlist/i.test(m.subject));

  it("sends one reminder to a wishlist that is a few hours old and counts the earlier ones as done", async () => {
    const w = await wishlistFor({ createdAgo: 3 * HOUR });

    await reminders();

    expect(remindersSent()).toHaveLength(1);
    expect(await flagsOf(w.id)).toEqual({ sent30min: true, sent2hr: true, sentDay1: false, sentDay3: false });
  });

  it("works however rarely the job runs: a day-old wishlist gets one reminder, not three", async () => {
    const w = await wishlistFor({ createdAgo: 30 * HOUR });

    await reminders();
    await reminders();

    expect(remindersSent()).toHaveLength(1);
    expect(await flagsOf(w.id)).toEqual({ sent30min: true, sent2hr: true, sentDay1: true, sentDay3: false });
  });

  it("sends the next reminder when its time comes", async () => {
    const w = await wishlistFor({ createdAgo: 80 * HOUR, flags: { sent30min: true, sent2hr: true, sentDay1: true } });

    await reminders();

    expect(remindersSent()).toHaveLength(1);
    expect((await flagsOf(w.id)).sentDay3).toBe(true);
  });

  it("waits for the first reminder and ignores wishlists with no address", async () => {
    await wishlistFor({ createdAgo: 10 * 60 * 1000 });
    const noEmail = await wishlistFor({ createdAgo: 3 * HOUR, email: null });

    await reminders();

    expect(remindersSent()).toHaveLength(0);
    expect((await flagsOf(noEmail.id)).sent30min).toBe(false);
  });

  it("deletes wishlists older than four days without mailing them", async () => {
    const old = await wishlistFor({ createdAgo: 5 * DAY });

    await reminders();

    expect(remindersSent()).toHaveLength(0);
    expect(await prisma.wishlist.findUnique({ where: { id: old.id } })).toBeNull();
  });

  it("keeps a reminder due for the next run when sending fails, and still sends the others", async () => {
    const failing = await wishlistFor({ createdAgo: 3 * HOUR, email: "bounce@example.com" });
    const fine = await wishlistFor({ createdAgo: 3 * HOUR, email: "fine@example.com" });
    (sendEmail as jest.Mock).mockImplementation(async (to: string) => {
      if (to === "bounce@example.com") throw new Error("mailbox unavailable");
    });

    const res = await reminders();

    expect(res.status).toBe(200);
    expect((await flagsOf(failing.id)).sent30min).toBe(false);
    expect((await flagsOf(fine.id)).sent30min).toBe(true);
  });
});
