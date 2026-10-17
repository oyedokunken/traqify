import prisma from "../src/config/database";
import { authed, createOrganization, createTenant } from "./helpers/factories";

async function createPaymentRow(organizationId: string, overrides: Partial<{ status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"; reference: string | null; amount: number }> = {}) {
  return prisma.payment.create({
    data: {
      amount: overrides.amount ?? 500,
      status: overrides.status ?? "PENDING",
      reference: overrides.reference === undefined ? null : overrides.reference,
      method: "TRANSFER",
      organizationId,
    },
  });
}

describe("listing payments is read-only", () => {
  it("does not create payment records for orders without one", async () => {
    const { org, owner, cashier } = await createTenant();
    await prisma.order.create({
      data: { orderNumber: "ORD-LEGACY", totalAmount: 900, status: "COMPLETED", organizationId: org.id, createdById: cashier.id },
    });

    const res = await authed(owner).get("/api/payments");

    expect(res.status).toBe(200);
    expect(await prisma.payment.count()).toBe(0);
    expect(res.body.payments).toHaveLength(0);
  });
});

describe("creating payments", () => {
  it("accepts a valid payment, rounds the amount and defaults the status", async () => {
    const { owner } = await createTenant();
    const res = await authed(owner).post("/api/payments").send({ amount: 19.999, method: "Cash", reference: "", notes: "" });
    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(20);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.reference).toBeNull();
    expect(res.body.currency).toBe("NGN");
  });

  it.each([[-1], [0], ["abc"], [null], [Number.MAX_SAFE_INTEGER * 1e10]])("rejects amount %p", async (amount) => {
    const { owner } = await createTenant();
    const res = await authed(owner).post("/api/payments").send({ amount });
    expect(res.status).toBe(400);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("rejects an unknown status and a non-NGN currency", async () => {
    const { owner } = await createTenant();
    expect((await authed(owner).post("/api/payments").send({ amount: 5, status: "PAID" })).status).toBe(400);
    expect((await authed(owner).post("/api/payments").send({ amount: 5, currency: "USD" })).status).toBe(400);
  });

  it("rejects an order from another organization", async () => {
    const { owner } = await createTenant();
    const other = await createTenant();
    const foreign = await prisma.order.create({
      data: { orderNumber: "ORD-FOREIGN", totalAmount: 1, organizationId: other.org.id, createdById: other.owner.id },
    });
    const res = await authed(owner).post("/api/payments").send({ amount: 5, orderId: foreign.id });
    expect(res.status).toBe(400);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("returns 409 for a duplicate reference", async () => {
    const { org, owner } = await createTenant();
    await createPaymentRow(org.id, { reference: "BANK-REF-1" });
    const res = await authed(owner).post("/api/payments").send({ amount: 5, reference: "BANK-REF-1" });
    expect(res.status).toBe(409);
  });

  it("is limited to owners and managers", async () => {
    const { owner, manager, cashier, auditor } = await createTenant();
    expect((await authed(cashier).post("/api/payments").send({ amount: 5 })).status).toBe(403);
    expect((await authed(auditor).post("/api/payments").send({ amount: 5 })).status).toBe(403);
    expect((await authed(manager).post("/api/payments").send({ amount: 5 })).status).toBe(201);
    expect((await authed(owner).post("/api/payments").send({ amount: 5 })).status).toBe(201);
  });
});

describe("updating payments", () => {
  const legal: ["PENDING" | "COMPLETED" | "FAILED" | "REFUNDED", "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"][] = [
    ["PENDING", "COMPLETED"],
    ["PENDING", "FAILED"],
    ["COMPLETED", "REFUNDED"],
    ["FAILED", "PENDING"],
  ];
  const illegal: typeof legal = [
    ["REFUNDED", "COMPLETED"],
    ["REFUNDED", "PENDING"],
    ["REFUNDED", "FAILED"],
    ["COMPLETED", "PENDING"],
    ["COMPLETED", "FAILED"],
    ["FAILED", "COMPLETED"],
    ["FAILED", "REFUNDED"],
    ["PENDING", "REFUNDED"],
  ];

  it.each(legal)("allows %s to %s", async (from, to) => {
    const { org, owner } = await createTenant();
    const payment = await createPaymentRow(org.id, { status: from });
    const res = await authed(owner).patch(`/api/payments/${payment.id}`).send({ status: to });
    expect(res.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(to);
  });

  it.each(illegal)("rejects %s to %s", async (from, to) => {
    const { org, owner } = await createTenant();
    const payment = await createPaymentRow(org.id, { status: from });
    const res = await authed(owner).patch(`/api/payments/${payment.id}`).send({ status: to });
    expect(res.status).toBe(409);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe(from);
  });

  it("rejects an unknown status", async () => {
    const { org, owner } = await createTenant();
    const payment = await createPaymentRow(org.id);
    expect((await authed(owner).patch(`/api/payments/${payment.id}`).send({ status: "PAID" })).status).toBe(400);
  });

  it("never changes the amount, currency, order link or organization", async () => {
    const { org, owner } = await createTenant();
    const other = await createOrganization();
    const payment = await createPaymentRow(org.id, { amount: 500 });
    const res = await authed(owner).patch(`/api/payments/${payment.id}`).send({
      notes: "checked", amount: 1, currency: "USD", organizationId: other.id, orderId: "x", id: "hijacked",
    });
    expect(res.status).toBe(200);
    const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after).toMatchObject({ amount: 500, currency: "NGN", organizationId: org.id, orderId: null, notes: "checked" });
  });

  it("lets a reference be set once but not changed afterwards", async () => {
    const { org, owner } = await createTenant();
    const payment = await createPaymentRow(org.id);
    expect((await authed(owner).patch(`/api/payments/${payment.id}`).send({ reference: "REF-1" })).status).toBe(200);
    expect((await authed(owner).patch(`/api/payments/${payment.id}`).send({ reference: "REF-1" })).status).toBe(200);
    expect((await authed(owner).patch(`/api/payments/${payment.id}`).send({ reference: "REF-2" })).status).toBe(400);
  });

  it("cannot touch another organization's payment", async () => {
    const { owner } = await createTenant();
    const other = await createTenant();
    const foreign = await createPaymentRow(other.org.id);
    expect((await authed(owner).patch(`/api/payments/${foreign.id}`).send({ status: "COMPLETED" })).status).toBe(404);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: foreign.id } })).status).toBe("PENDING");
  });

  it("applies only one of two conflicting concurrent transitions", async () => {
    const { org, owner, manager } = await createTenant();
    const payment = await createPaymentRow(org.id);
    const results = await Promise.all([
      authed(owner).patch(`/api/payments/${payment.id}`).send({ status: "COMPLETED" }),
      authed(manager).patch(`/api/payments/${payment.id}`).send({ status: "FAILED" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it("is limited to owners and managers", async () => {
    const { org, cashier, auditor } = await createTenant();
    const payment = await createPaymentRow(org.id);
    expect((await authed(cashier).patch(`/api/payments/${payment.id}`).send({ status: "COMPLETED" })).status).toBe(403);
    expect((await authed(auditor).patch(`/api/payments/${payment.id}`).send({ status: "COMPLETED" })).status).toBe(403);
  });
});
