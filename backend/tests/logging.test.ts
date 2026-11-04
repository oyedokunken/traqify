import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/database";
import { sendEmail } from "../src/config/email";
import { captureLogs } from "../src/config/logger";
import { redactUrl } from "../src/utils/redact";
import { authed, createProduct, createTenant } from "./helpers/factories";

// Made up values shaped like real tokens (long, URL safe) so the redaction has something to find.
const INVITE_TOKEN = `test_only_not_a_secret_${"i".repeat(40)}`;
const OAUTH_CODE = `test_only_not_a_secret_${"o".repeat(30)}`;
const GOOGLE_STATE = "f".repeat(64);

describe("redactUrl", () => {
  it("removes a token from a path but keeps the shape of the URL", () => {
    expect(redactUrl(`/api/staff/invite/${INVITE_TOKEN}`)).toBe("/api/staff/invite/[redacted]");
    expect(redactUrl(`/api/auth/oauth-exchange/${OAUTH_CODE}`)).toBe("/api/auth/oauth-exchange/[redacted]");
  });

  it("removes sensitive query parameters and keeps the others", () => {
    expect(redactUrl(`/api/auth/google-callback?code=4%2F0AbCd&state=${GOOGLE_STATE}`)).toBe("/api/auth/google-callback?code=[redacted]&state=[redacted]");
    expect(redactUrl("/x?token=abc&page=2&sig=zzz&exp=123")).toBe("/x?token=[redacted]&page=2&sig=[redacted]&exp=123");
    expect(redactUrl("/x?TOKEN=abc&Access_Token=def&otp=123456&password=hunter2")).toBe("/x?TOKEN=[redacted]&Access_Token=[redacted]&otp=[redacted]&password=[redacted]");
  });

  it("handles encoded names, repeated and valueless parameters", () => {
    expect(redactUrl("/x?%63ode=abc&flag&code=1&code=2")).toBe("/x?%63ode=[redacted]&flag&code=[redacted]&code=[redacted]");
  });

  it("leaves ordinary paths, ids and short segments alone", () => {
    expect(redactUrl("/api/orders/cmozv5hd50001dgqc032lfkg6/status")).toBe("/api/orders/cmozv5hd50001dgqc032lfkg6/status");
    expect(redactUrl("/api/products?page=2&limit=50&search=blue")).toBe("/api/products?page=2&limit=50&search=blue");
    expect(redactUrl("/")).toBe("/");
  });

  it("redacts a download link's signature but keeps the ids", () => {
    expect(redactUrl("/api/store/shop/downloads/order1/prod1?exp=1790000000000&sig=abcDEF123_-")).toBe("/api/store/shop/downloads/order1/prod1?exp=1790000000000&sig=[redacted]");
  });
});

describe("request logging", () => {
  let capture: ReturnType<typeof captureLogs>;
  beforeEach(() => { capture = captureLogs(); });
  afterEach(() => { capture.stop(); jest.restoreAllMocks(); });

  const allText = () => capture.lines.join("\n");
  const requestLines = () => capture.entries().filter((e) => e.msg === "request completed");

  it("does not log an invitation token that appears in the URL", async () => {
    await request(app).get(`/api/staff/invite/${INVITE_TOKEN}`);
    expect(allText()).not.toContain(INVITE_TOKEN);
    const [line] = requestLines();
    expect((line.req as { url: string }).url).toBe("/api/staff/invite/[redacted]");
  });

  it("does not log an OAuth exchange code, or Google's code and state", async () => {
    await request(app).get(`/api/auth/oauth-exchange/${OAUTH_CODE}`);
    await request(app).get(`/api/auth/google-callback?code=4%2F0AfJohXlongsecretcode&state=${GOOGLE_STATE}`);
    const text = allText();
    expect(text).not.toContain(OAUTH_CODE);
    expect(text).not.toContain("4%2F0AfJohXlongsecretcode");
    expect(text).not.toContain(GOOGLE_STATE);
    expect(requestLines().map((l) => (l.req as { url: string }).url)).toEqual([
      "/api/auth/oauth-exchange/[redacted]",
      "/api/auth/google-callback?code=[redacted]&state=[redacted]",
    ]);
  });

  it("never logs auth headers, cookies or request bodies", async () => {
    await request(app)
      .post("/api/auth/login")
      .set("Authorization", "Bearer test_only_secret_bearer_value")
      .set("Cookie", "traqify_rt=test_only_secret_cookie_value")
      .send({ email: "someone@example.com", password: "test_only_secret_password_value" });

    const text = allText();
    for (const secret of ["test_only_secret_bearer_value", "test_only_secret_cookie_value", "test_only_secret_password_value", "someone@example.com"]) {
      expect(text).not.toContain(secret);
    }
    const entry = requestLines()[0];
    expect(Object.keys(entry.req as object).sort()).toEqual(["id", "method", "url"]);
    expect(entry).not.toHaveProperty("body");
    expect(entry).not.toHaveProperty("headers");
  });

  it("gives every request an id, returns it, and uses it in the log line", async () => {
    const res = await request(app).get("/api/auth/me");
    const id = res.headers["x-request-id"];
    expect(id).toMatch(/^[\w.:-]{8,128}$/);
    expect((requestLines()[0].req as { id: string }).id).toBe(id);
  });

  it("reuses a well formed id from the platform and replaces a malformed one", async () => {
    const good = await request(app).get("/api/auth/me").set("x-vercel-id", "iad1::abcde-1792000000000-0123456789ab");
    expect(good.headers["x-request-id"]).toBe("iad1::abcde-1792000000000-0123456789ab");
    const bad = await request(app).get("/api/auth/me").set("x-request-id", "not a valid id <script>");
    expect(bad.headers["x-request-id"]).not.toContain("script");
  });

  it("logs 4xx as warnings and does not log the health check", async () => {
    await request(app).get("/health");
    await request(app).get("/api/auth/me");
    const lines = requestLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].level).toBe(40);
  });

  it("includes who made an authenticated request, by id only", async () => {
    const { owner, org } = await createTenant();
    await authed(owner).get("/api/products");
    const line = requestLines().find((l) => (l.req as { url: string }).url === "/api/products");
    expect(line).toMatchObject({ userId: owner.id, organizationId: org.id });
    expect(allText()).not.toContain(owner.email);
  });
});

describe("unexpected errors", () => {
  let capture: ReturnType<typeof captureLogs>;
  beforeEach(() => { capture = captureLogs(); });
  afterEach(() => { capture.stop(); jest.restoreAllMocks(); });

  it("logs the real error with the request id but sends the client only a safe message and that id", async () => {
    jest.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("secret internal detail: connection string postgres://user:pw@host/db"));

    const res = await request(app).post("/api/auth/login").send({ email: "someone@example.com", password: "Whatever1!" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Login failed. Please try again.");
    expect(res.body.requestId).toBe(res.headers["x-request-id"]);
    expect(JSON.stringify(res.body)).not.toContain("secret internal detail");

    const failure = capture.entries().find((e) => e.level === 50 && e.requestId === res.headers["x-request-id"]);
    expect(failure).toBeDefined();
    expect(JSON.stringify(failure)).toContain("secret internal detail");
  });

  it("does not expose error detail from the cron endpoints, but logs it", async () => {
    jest.spyOn(prisma.oTPVerification, "deleteMany").mockRejectedValue(new Error("secret database detail"));
    jest.spyOn(prisma.wishlist, "deleteMany").mockRejectedValue(new Error("secret wishlist detail"));
    const auth = { Authorization: `Bearer ${process.env.CRON_SECRET}` };

    const housekeeping = await request(app).get("/api/cron/housekeeping").set(auth);
    expect(housekeeping.status).toBe(500);
    expect(Object.keys(housekeeping.body).sort()).toEqual(["checkouts", "deleted", "invitesExpired", "uploadsRemoved"]);
    expect(JSON.stringify(housekeeping.body)).not.toContain("secret database detail");

    const reminders = await request(app).get("/api/cron/wishlist-reminders").set(auth);
    expect(reminders.status).toBe(500);
    expect(reminders.body).toMatchObject({ error: "Wishlist reminders failed." });
    expect(JSON.stringify(reminders.body)).not.toContain("secret wishlist detail");

    const logged = capture.lines.join("\n");
    expect(logged).toContain("secret database detail");
    expect(logged).toContain("secret wishlist detail");
  });

  it("answers 400, not 500, for malformed JSON and does not log the body", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send('{"email": "x@example.com", "password": oops');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("The request could not be understood.");
    expect(capture.lines.join("\n")).not.toContain("oops");
  });

  it("answers 413 for a body over the limit", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "x@example.com", password: "x".repeat(11 * 1024 * 1024) });
    expect(res.status).toBe(413);
  });

  it("uses the same error shape for unknown routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "The requested resource was not found.", requestId: res.headers["x-request-id"] });
  });
});

describe("background failures are logged, not swallowed", () => {
  let capture: ReturnType<typeof captureLogs>;
  beforeEach(() => { capture = captureLogs(); });
  afterEach(() => { capture.stop(); });

  it("a failing notification email does not fail the order but leaves a warning", async () => {
    const { org, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 5 });
    (sendEmail as jest.Mock).mockRejectedValue(new Error("smtp is down"));
    try {
      const res = await authed(cashier).post("/api/orders").send({
        items: [{ productId: product.id, quantity: 1 }],
        newCustomer: { name: "Buyer", email: "buyer@example.com", phone: "08012345678" },
      });
      expect(res.status).toBe(201);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const warnings = capture.entries().filter((e) => e.level === 40 && /failed/.test(String(e.msg)) && !("req" in e));
      expect(warnings.length).toBeGreaterThan(0);
      expect(JSON.stringify(warnings)).toContain("smtp is down");
      expect(capture.lines.join("\n")).not.toContain("buyer@example.com");
    } finally {
      (sendEmail as jest.Mock).mockResolvedValue(undefined);
    }
  });
});
