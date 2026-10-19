import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/database";
import { initializePaystackTransaction, refundPaystackTransaction, verifyPaystackTransaction } from "../src/utils/paystack";
import { createProduct, createTenant } from "./helpers/factories";
import { mockPaystack } from "./helpers/paystack";

const KEY = "test_only_not_a_secret_paystack";
const EMAIL = "private.customer@example.com";

let errors: jest.SpyInstance;

beforeEach(() => {
  process.env.PAYSTACK_SECRET_KEY = KEY;
  errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Replaces fetch with a fixed answer. */
function answer(http: number, body: unknown) {
  return jest.spyOn(global, "fetch").mockResolvedValue({ ok: http < 400, status: http, json: async () => body } as Response);
}

const logged = () => errors.mock.calls.map((call) => call.join(" ")).join("\n");

const initialize = () =>
  initializePaystackTransaction({ email: EMAIL, amountKobo: 10000, reference: "TRQ-abc", callbackUrl: "https://app.example.test/cb", metadata: { slug: "s" } });

/** Nothing sensitive may reach a log line, whatever went wrong. */
function expectNoSecrets() {
  const text = logged();
  expect(text).not.toContain(KEY);
  expect(text).not.toContain("Bearer");
  expect(text).not.toContain(EMAIL);
  expect(text).not.toContain("authorization_url");
  expect(text).not.toContain("access_code");
}

describe("initialize failures", () => {
  it("tells the customer when Paystack refuses their email address, instead of reporting an outage", async () => {
    answer(400, { status: false, message: '"email" must be a valid email' });
    await expect(initialize()).rejects.toMatchObject({ statusCode: 400, message: "Please enter a valid email address." });
    expect(logged()).toContain("HTTP 400");
    expectNoSecrets();
  });

  it("still reports an outage for other 400 responses and for an email message on other statuses", async () => {
    answer(400, { status: false, message: "Currency not supported by merchant" });
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
    answer(500, { status: false, message: "email service is down" });
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
  });

  it("logs the HTTP status and Paystack's message when the key is rejected", async () => {
    answer(401, { status: false, message: "Invalid key" });
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
    expect(logged()).toBe('[paystack] initialize failed, HTTP 401, message "Invalid key"');
    expectNoSecrets();
  });

  it("logs merchant or currency problems exactly as Paystack words them", async () => {
    answer(400, { status: false, message: "Currency not supported by merchant" });
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
    expect(logged()).toContain("Currency not supported by merchant");
    expect(logged()).toContain("HTTP 400");
  });

  it("logs an unexpected success shape without echoing it", async () => {
    answer(200, { status: true, data: { reference: "SOMETHING-ELSE", authorization_url: "https://pay.example/x", access_code: "ac_secret" } });
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
    expect(logged()).toContain("unexpected response shape");
    expectNoSecrets();
  });

  it("logs a network failure with its type and cause code, not its details", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }));
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
    expect(logged()).toBe("[paystack] initialize failed, network error (TypeError ECONNRESET)");
    expectNoSecrets();
  });

  it("logs a timeout", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(Object.assign(new Error("The operation was aborted"), { name: "TimeoutError" }));
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
    expect(logged()).toContain("network error (TimeoutError)");
  });

  it("logs a response that is not JSON", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } } as unknown as Response);
    await expect(initialize()).rejects.toMatchObject({ statusCode: 502 });
    expect(logged()).toBe("[paystack] initialize failed, response was not JSON, HTTP 502");
  });

  it("does not log anything on success", async () => {
    answer(200, { status: true, data: { authorization_url: "https://pay.example/x", access_code: "ac_1", reference: "TRQ-abc" } });
    await expect(initialize()).resolves.toMatchObject({ accessCode: "ac_1" });
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("message handling", () => {
  it("redacts the secret key if Paystack ever echoes it back", async () => {
    answer(401, { status: false, message: `Invalid key ${KEY} supplied` });
    await expect(initialize()).rejects.toBeDefined();
    expect(logged()).toContain("Invalid key [redacted] supplied");
    expect(logged()).not.toContain(KEY);
  });

  it("truncates a very long message", async () => {
    answer(400, { status: false, message: "x".repeat(5000) });
    await expect(initialize()).rejects.toBeDefined();
    expect(logged().length).toBeLessThan(300);
  });

  it("copes with a missing or non-string message", async () => {
    answer(500, { status: false });
    await expect(initialize()).rejects.toBeDefined();
    expect(logged()).toBe("[paystack] initialize failed, HTTP 500");
    errors.mockClear();
    answer(500, { status: false, message: { nested: true } });
    await expect(initialize()).rejects.toBeDefined();
    expect(logged()).toContain('message "(no message)"');
  });
});

describe("verify", () => {
  it("stays quiet for a reference Paystack does not know", async () => {
    answer(404, { status: false, message: "Transaction reference not found" });
    await expect(verifyPaystackTransaction("TRQ-x")).resolves.toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });

  it.each([[401], [403], [429], [500], [503]])("logs HTTP %i, which means a configuration or availability problem", async (http) => {
    answer(http, { status: false, message: "Something is wrong" });
    await expect(verifyPaystackTransaction("TRQ-x")).resolves.toBeNull();
    expect(logged()).toBe(`[paystack] verify failed, HTTP ${http}, message "Something is wrong"`);
    expectNoSecrets();
  });

  it("logs a network failure and still throws, so an outage is never read as a failed payment", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(verifyPaystackTransaction("TRQ-x")).rejects.toMatchObject({ statusCode: 502 });
    expect(logged()).toBe("[paystack] verify failed, network error (TypeError)");
  });

  it("logs a malformed success body", async () => {
    answer(200, { status: true, data: { status: "success", amount: "100", currency: "NGN", reference: "TRQ-x" } });
    await expect(verifyPaystackTransaction("TRQ-x")).resolves.toBeNull();
    expect(logged()).toContain("unexpected response shape");
  });

  it("does not log a normal success", async () => {
    answer(200, { status: true, data: { status: "success", amount: 100, currency: "NGN", reference: "TRQ-x" } });
    await expect(verifyPaystackTransaction("TRQ-x")).resolves.toMatchObject({ amountKobo: 100 });
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("refund", () => {
  it("logs Paystack's reason when a refund is refused and returns false", async () => {
    answer(400, { status: false, message: "Transaction has already been fully refunded" });
    await expect(refundPaystackTransaction("TRQ-x")).resolves.toBe(false);
    expect(logged()).toBe('[paystack] refund failed, HTTP 400, message "Transaction has already been fully refunded"');
    expectNoSecrets();
  });

  it("logs a network failure once and returns false", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new TypeError("fetch failed"));
    await expect(refundPaystackTransaction("TRQ-x")).resolves.toBe(false);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(logged()).toBe("[paystack] refund failed, network error (TypeError)");
  });

  it("does not log an accepted refund", async () => {
    answer(200, { status: true, message: "Refund has been queued for processing" });
    await expect(refundPaystackTransaction("TRQ-x")).resolves.toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("through the checkout endpoint", () => {
  it("answers 400, not 502, and stores no checkout when Paystack refuses the customer's email", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { price: 1000, stock: 5 });
    answer(400, { status: false, message: '"email" must be a valid email' });

    const res = await request(app)
      .post(`/api/store/${org.slug}/checkout/initialize`)
      .send({ name: "Buyer", email: "buyer@example.test", items: [{ productId: product.id, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Please enter a valid email address.");
    expect(await prisma.checkoutSession.count()).toBe(0);
  });

  it("a Paystack rejection during checkout initialization is logged and the customer still gets a 502", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { price: 1000, stock: 5 });
    mockPaystack({ initializeFails: true });

    const res = await request(app)
      .post(`/api/store/${org.slug}/checkout/initialize`)
      .send({ name: "Buyer", email: EMAIL, items: [{ productId: product.id, quantity: 1 }] });

    expect(res.status).toBe(502);
    expect(res.body.error).not.toMatch(/invalid key/i);
    expect(logged()).toContain("[paystack] initialize failed");
    expect(logged()).toContain("Invalid key");
    expectNoSecrets();
  });
});
