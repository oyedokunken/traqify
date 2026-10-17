import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { createOrganization, createProduct, createTenant, createUser } from "./helpers/factories";
import { sentMail } from "./helpers/mail";
import { mockPaystack, PaystackMockOptions } from "./helpers/paystack";

const customer = { name: "Ada Buyer", email: "ada@example.com", phone: "08012345678", address: "1 Test Street" };

const initialize = (slug: string, body: Record<string, unknown>) =>
  request(app).post(`/api/store/${slug}/checkout/initialize`).send({ ...customer, ...body });

const complete = (slug: string, reference: unknown) =>
  request(app).post(`/api/store/${slug}/checkout`).send({ paymentMethod: "PAYSTACK", reference });

async function setup(price = 1000, stock = 10) {
  const { org, owner } = await createTenant();
  const product = await createProduct(org.id, { price, stock });
  return { org, owner, product };
}

/** Initializes a checkout and returns the reference plus the session the server stored. */
async function startCheckout(slug: string, productId: string, quantity = 2) {
  const res = await initialize(slug, { items: [{ productId, quantity }] });
  expect(res.status).toBe(201);
  const session = await prisma.checkoutSession.findUniqueOrThrow({ where: { reference: res.body.reference } });
  return { reference: res.body.reference as string, session, body: res.body };
}

const stockOf = async (productId: string) => (await prisma.inventory.findUnique({ where: { productId } }))?.quantity;

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Paystack initialization (server prices the cart)", () => {
  it("creates a pending session and a Paystack transaction using the server total", async () => {
    const { org, product } = await setup(1500.5);
    const paystack = mockPaystack();

    const { reference, session, body } = await startCheckout(org.slug, product.id, 3);

    expect(reference).toMatch(/^TRQ-[a-f0-9]{24}$/);
    expect(body.accessCode).toBe(`ac_${reference}`);
    expect(body.authorizationUrl).toContain(reference);
    expect(body.amount).toBe(4501.5);
    expect(session.status).toBe("PENDING");
    expect(session.amountKobo).toBe(450150);
    expect(session.organizationId).toBe(org.id);
    expect(paystack.calls.initialize).toHaveLength(1);
    expect(paystack.calls.initialize[0]).toMatchObject({ amount: 450150, currency: "NGN", email: customer.email, reference });
  });

  it("ignores any amount, price or reference supplied by the client", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();

    const res = await initialize(org.slug, {
      amount: 1,
      totalAmount: 1,
      reference: "TRQ-EVIL",
      items: [{ productId: product.id, quantity: 2, price: 1, unitPrice: 1 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.reference).not.toBe("TRQ-EVIL");
    expect(paystack.calls.initialize[0]).toMatchObject({ amount: 200000 });
    expect(await prisma.checkoutSession.count({ where: { reference: "TRQ-EVIL" } })).toBe(0);
  });

  it("issues a different reference every time", async () => {
    const { org, product } = await setup();
    mockPaystack();
    const a = await startCheckout(org.slug, product.id, 1);
    const b = await startCheckout(org.slug, product.id, 1);
    expect(a.reference).not.toBe(b.reference);
  });

  it.each([[-1], [0], [1.5], ["2"], [101]])("rejects quantity %p without calling Paystack", async (quantity) => {
    const { org, product } = await setup();
    const paystack = mockPaystack();
    const res = await initialize(org.slug, { items: [{ productId: product.id, quantity }] });
    expect(res.status).toBe(400);
    expect(paystack.spy).not.toHaveBeenCalled();
    expect(await prisma.checkoutSession.count()).toBe(0);
  });

  it("fails early when stock is insufficient, before anyone is asked to pay", async () => {
    const { org, product } = await setup(1000, 1);
    const paystack = mockPaystack();
    const res = await initialize(org.slug, { items: [{ productId: product.id, quantity: 2 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stock/i);
    expect(paystack.spy).not.toHaveBeenCalled();
  });

  it("refuses totals that do not fit the stored amount", async () => {
    const { org, product } = await setup(30_000_000);
    const paystack = mockPaystack();
    const res = await initialize(org.slug, { items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(paystack.spy).not.toHaveBeenCalled();
  });

  it("does not initialize for an unpublished store or another store's products", async () => {
    const hidden = await createOrganization({ storePublished: false });
    await createUser(hidden.id, "OWNER");
    const hiddenProduct = await createProduct(hidden.id);
    const { org } = await setup();
    mockPaystack();
    expect((await initialize(hidden.slug, { items: [{ productId: hiddenProduct.id, quantity: 1 }] })).status).toBe(404);
    expect((await initialize(org.slug, { items: [{ productId: hiddenProduct.id, quantity: 1 }] })).status).toBe(400);
  });

  it("returns 502 and stores nothing when Paystack rejects the initialization", async () => {
    const { org, product } = await setup();
    mockPaystack({ initializeFails: true });
    const res = await initialize(org.slug, { items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(502);
    expect(await prisma.checkoutSession.count()).toBe(0);
  });
});

describe("Paystack completion (reference must belong to a server created checkout)", () => {
  const paid = (session: { amountKobo: number }, extra: Partial<{ status: string; currency: string; reference: string; amount: number }> = {}) => ({
    status: "success",
    currency: "NGN",
    amount: session.amountKobo,
    ...extra,
  });

  it("creates the order from the stored cart and marks the session completed", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();
    const { reference, session } = await startCheckout(org.slug, product.id, 2);
    paystack.setTransaction(reference, paid(session));

    const res = await complete(org.slug, reference);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("APPROVED");
    expect(res.body.totalAmount).toBe(2000);
    const order = await prisma.order.findFirstOrThrow({ include: { orderItems: true, customer: true } });
    expect(order.orderItems).toHaveLength(1);
    expect(order.orderItems[0].quantity).toBe(2);
    expect(order.customer?.email).toBe(customer.email);
    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment).toMatchObject({ reference, status: "COMPLETED", amount: 2000, method: "PAYSTACK" });
    expect(await stockOf(product.id)).toBe(8);
    expect((await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } })).status).toBe("COMPLETED");
  });

  it("rejects a reference the server never issued, even if Paystack says it succeeded", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack({ transactions: { "TRQ-CLIENT-MADE": { status: "success", currency: "NGN", amount: 100 } } });
    const res = await complete(org.slug, "TRQ-CLIENT-MADE");
    expect(res.status).toBe(404);
    expect(paystack.calls.verify).toHaveLength(0);
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("rejects another store's reference", async () => {
    const a = await setup(1000);
    const b = await setup(1000);
    const paystack = mockPaystack();
    const { reference, session } = await startCheckout(a.org.slug, a.product.id, 1);
    paystack.setTransaction(reference, paid(session));

    const res = await complete(b.org.slug, reference);
    expect(res.status).toBe(404);
    expect(await prisma.order.count()).toBe(0);
  });

  it("is idempotent: completing the same reference again returns the same order", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();
    const { reference, session } = await startCheckout(org.slug, product.id, 2);
    paystack.setTransaction(reference, paid(session));

    const first = await complete(org.slug, reference);
    const second = await complete(org.slug, reference);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.payment.count()).toBe(1);
    expect(await stockOf(product.id)).toBe(8);
    expect(paystack.calls.verify).toHaveLength(1);
  });

  it("handles two simultaneous completions of one reference as one order", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();
    const { reference, session } = await startCheckout(org.slug, product.id, 2);
    paystack.setTransaction(reference, paid(session));

    const results = await Promise.all([complete(org.slug, reference), complete(org.slug, reference)]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
    expect(results[0].body.id).toBe(results[1].body.id);
    expect(await prisma.order.count()).toBe(1);
    expect(await prisma.payment.count()).toBe(1);
    expect(await stockOf(product.id)).toBe(8);
    expect(paystack.calls.refund).toHaveLength(0);
  });

  it("rejects a transaction Paystack did not mark successful and leaves the session pending", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();
    const { reference, session } = await startCheckout(org.slug, product.id, 2);
    paystack.setTransaction(reference, paid(session, { status: "failed" }));

    const res = await complete(org.slug, reference);
    expect(res.status).toBe(402);
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf(product.id)).toBe(10);
    expect((await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } })).status).toBe("PENDING");
    expect(paystack.calls.refund).toHaveLength(0);
  });

  it.each([
    ["amount differs from the session", { amount: 100 }],
    ["currency differs", { currency: "USD" }],
    ["response reference differs", { reference: "SOME_OTHER_REF" }],
  ])("rejects when the %s", async (_label, override) => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();
    const { reference, session } = await startCheckout(org.slug, product.id, 2);
    paystack.setTransaction(reference, paid(session, override));

    const res = await complete(org.slug, reference);
    expect(res.status).toBe(402);
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("returns 502 and keeps the session pending when Paystack cannot be reached", async () => {
    const { org, product } = await setup(1000);
    const options: PaystackMockOptions = {};
    const paystack = mockPaystack(options);
    const { reference, session } = await startCheckout(org.slug, product.id, 1);
    paystack.setTransaction(reference, paid(session));
    jest.restoreAllMocks();
    mockPaystack({ verifyThrows: true });

    const res = await complete(org.slug, reference);
    expect(res.status).toBe(502);
    expect((await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } })).status).toBe("PENDING");
  });

  it("validates the reference format", async () => {
    const { org } = await setup();
    mockPaystack();
    expect((await complete(org.slug, undefined)).status).toBe(400);
    expect((await complete(org.slug, "a/b?c")).status).toBe(400);
    expect((await complete(org.slug, "")).status).toBe(400);
  });

  describe("failure after a successful charge", () => {
    it("refunds when the stock sold out between initialization and payment", async () => {
      const { org, product } = await setup(1000, 5);
      const paystack = mockPaystack();
      const { reference, session } = await startCheckout(org.slug, product.id, 2);
      paystack.setTransaction(reference, paid(session));
      await prisma.inventory.update({ where: { productId: product.id }, data: { quantity: 1 } });

      const res = await complete(org.slug, reference);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/refunded/i);
      expect(paystack.calls.refund).toEqual([{ transaction: reference }]);
      const after = await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } });
      expect(after.status).toBe("REFUNDED");
      expect(after.failureReason).toMatch(/stock/i);
      expect(await prisma.order.count()).toBe(0);
      expect(await prisma.payment.count()).toBe(0);
      expect(await stockOf(product.id)).toBe(1);
    });

    it("refunds when the price changed after the customer was quoted", async () => {
      const { org, product } = await setup(1000);
      const paystack = mockPaystack();
      const { reference, session } = await startCheckout(org.slug, product.id, 2);
      paystack.setTransaction(reference, paid(session));
      await prisma.product.update({ where: { id: product.id }, data: { price: 2000 } });

      const res = await complete(org.slug, reference);

      expect(res.status).toBe(409);
      expect(paystack.calls.refund).toHaveLength(1);
      expect((await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } })).status).toBe("REFUNDED");
      expect(await prisma.order.count()).toBe(0);
      expect(await stockOf(product.id)).toBe(10);
    });

    it("refunds when the product was deactivated", async () => {
      const { org, product } = await setup(1000);
      const paystack = mockPaystack();
      const { reference, session } = await startCheckout(org.slug, product.id, 1);
      paystack.setTransaction(reference, paid(session));
      await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });

      expect((await complete(org.slug, reference)).status).toBe(409);
      expect(paystack.calls.refund).toHaveLength(1);
    });

    it("records REFUND_FAILED, tells the customer and emails the owner when the refund call fails", async () => {
      const { org, owner, product } = await setup(1000, 5);
      const paystack = mockPaystack({ refundOk: false });
      const { reference, session } = await startCheckout(org.slug, product.id, 2);
      paystack.setTransaction(reference, paid(session));
      await prisma.inventory.update({ where: { productId: product.id }, data: { quantity: 0 } });

      const res = await complete(org.slug, reference);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/could not refund/i);
      expect(res.body.error).toContain(reference);
      expect((await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } })).status).toBe("REFUND_FAILED");
      const notice = sentMail().find((m) => m.to === owner.email && m.subject.startsWith("Action needed"));
      expect(notice?.html).toContain(reference);
    });

    it("does not refund twice and does not allow a refunded checkout to be completed", async () => {
      const { org, product } = await setup(1000, 5);
      const paystack = mockPaystack();
      const { reference, session } = await startCheckout(org.slug, product.id, 2);
      paystack.setTransaction(reference, paid(session));
      await prisma.inventory.update({ where: { productId: product.id }, data: { quantity: 0 } });

      await complete(org.slug, reference);
      await prisma.inventory.update({ where: { productId: product.id }, data: { quantity: 10 } });
      const retry = await complete(org.slug, reference);

      expect(retry.status).toBe(409);
      expect(paystack.calls.refund).toHaveLength(1);
      expect(await prisma.order.count()).toBe(0);
    });

    it("does not refund on transient server errors, so the customer can retry", async () => {
      const { org, product } = await setup(1000);
      const paystack = mockPaystack();
      const { reference, session } = await startCheckout(org.slug, product.id, 1);
      paystack.setTransaction(reference, paid(session));
      jest.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("connection reset"));

      const res = await complete(org.slug, reference);

      expect(res.status).toBe(500);
      expect(paystack.calls.refund).toHaveLength(0);
      expect((await prisma.checkoutSession.findUniqueOrThrow({ where: { reference } })).status).toBe("PENDING");
    });
  });
});

describe("bank transfer checkout is unchanged", () => {
  it("places a pending order and never contacts Paystack", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();
    const res = await request(app)
      .post(`/api/store/${org.slug}/checkout`)
      .send({ ...customer, paymentMethod: "TRANSFER", items: [{ productId: product.id, quantity: 2 }], reference: "TRQ-IGNORED" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING");
    expect(paystack.spy).not.toHaveBeenCalled();
    expect((await prisma.payment.findFirstOrThrow()).reference).toBeNull();
  });

  it("no longer accepts a client supplied Paystack cart", async () => {
    const { org, product } = await setup(1000);
    const paystack = mockPaystack();
    const res = await request(app)
      .post(`/api/store/${org.slug}/checkout`)
      .send({ ...customer, paymentMethod: "PAYSTACK", paystackReference: "TRQ-MINE", items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(paystack.spy).not.toHaveBeenCalled();
    expect(await prisma.order.count()).toBe(0);
  });
});
