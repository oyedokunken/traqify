import { OrderStatus } from "@prisma/client";
import prisma from "../src/config/database";
import { authed, createProduct, createTenant } from "./helpers/factories";
import { sentMail } from "./helpers/mail";

/** Places a real order through the API so stock is decremented the normal way. */
async function placeOrder(quantity = 3, stock = 10) {
  const tenant = await createTenant();
  const product = await createProduct(tenant.org.id, { price: 1000, stock });
  const res = await authed(tenant.owner).post("/api/orders").send({ items: [{ productId: product.id, quantity }] });
  expect(res.status).toBe(201);
  return { ...tenant, product, order: res.body as { id: string } };
}

const setStatus = (user: Parameters<typeof authed>[0], id: string, status: unknown) =>
  authed(user).patch(`/api/orders/${id}/status`).send({ status });

const stockOf = async (productId: string) => (await prisma.inventory.findUnique({ where: { productId } }))?.quantity;

describe("order status transitions", () => {
  const cases: [OrderStatus, OrderStatus, number][] = [
    ["PENDING", "APPROVED", 200],
    ["PENDING", "COMPLETED", 200],
    ["PENDING", "CANCELLED", 200],
    ["APPROVED", "COMPLETED", 200],
    ["APPROVED", "CANCELLED", 200],
    ["APPROVED", "PENDING", 409],
    ["COMPLETED", "PENDING", 409],
    ["COMPLETED", "APPROVED", 409],
    ["COMPLETED", "CANCELLED", 409],
    ["CANCELLED", "PENDING", 409],
    ["CANCELLED", "APPROVED", 409],
    ["CANCELLED", "COMPLETED", 409],
  ];

  it.each(cases)("%s to %s returns %i", async (from, to, expected) => {
    const { owner, order } = await placeOrder();
    await prisma.order.update({ where: { id: order.id }, data: { status: from } });
    const res = await setStatus(owner, order.id, to);
    expect(res.status).toBe(expected);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe(expected === 200 ? to : from);
  });

  it("rejects an unknown status", async () => {
    const { owner, order } = await placeOrder();
    expect((await setStatus(owner, order.id, "SHIPPED")).status).toBe(400);
    expect((await setStatus(owner, order.id, undefined)).status).toBe(400);
  });

  it("repeating the current status is a harmless no-op that sends no second email", async () => {
    const { org, owner, order } = await placeOrder();
    const customer = await prisma.customer.create({ data: { name: "Buyer", email: "buyer@example.com", organizationId: org.id } });
    await prisma.order.update({ where: { id: order.id }, data: { customerId: customer.id, status: "PENDING" } });

    expect((await setStatus(owner, order.id, "APPROVED")).status).toBe(200);
    expect((await setStatus(owner, order.id, "APPROVED")).status).toBe(200);

    const approvals = sentMail().filter((m) => m.to === "buyer@example.com" && /approved/i.test(m.subject));
    expect(approvals).toHaveLength(1);
  });

  it("is limited to owners and managers and scoped to the organization", async () => {
    const { cashier, auditor, order } = await placeOrder();
    const stranger = await createTenant();
    expect((await setStatus(cashier, order.id, "APPROVED")).status).toBe(403);
    expect((await setStatus(auditor, order.id, "APPROVED")).status).toBe(403);
    expect((await setStatus(stranger.owner, order.id, "APPROVED")).status).toBe(404);
  });
});

describe("cancelling an order restores stock", () => {
  it("puts the quantity back and fails a pending payment", async () => {
    const { owner, product, order } = await placeOrder(3, 10);
    expect(await stockOf(product.id)).toBe(7);
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: "PENDING" } });

    const res = await setStatus(owner, order.id, "CANCELLED");

    expect(res.status).toBe(200);
    expect(await stockOf(product.id)).toBe(10);
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe("FAILED");
  });

  it("leaves a completed payment alone so the refund is recorded explicitly", async () => {
    const { owner, order } = await placeOrder();
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe("COMPLETED");
    await setStatus(owner, order.id, "CANCELLED");
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe("COMPLETED");
  });

  it("restores stock only once when cancelled twice", async () => {
    const { owner, product, order } = await placeOrder(3, 10);
    await setStatus(owner, order.id, "CANCELLED");
    const again = await setStatus(owner, order.id, "CANCELLED");
    expect(again.status).toBe(200);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("restores stock only once when two cancellations race", async () => {
    const { owner, manager, product, order } = await placeOrder(3, 10);
    const results = await Promise.all([setStatus(owner, order.id, "CANCELLED"), setStatus(manager, order.id, "CANCELLED")]);
    expect(results.every((r) => [200, 409].includes(r.status))).toBe(true);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("does not restore stock for a delivered order", async () => {
    const { owner, product, order } = await placeOrder(3, 10);
    await setStatus(owner, order.id, "COMPLETED");
    expect((await setStatus(owner, order.id, "CANCELLED")).status).toBe(409);
    expect(await stockOf(product.id)).toBe(7);
  });

  it("completing an order does not touch stock", async () => {
    const { owner, product, order } = await placeOrder(3, 10);
    await setStatus(owner, order.id, "APPROVED");
    await setStatus(owner, order.id, "COMPLETED");
    expect(await stockOf(product.id)).toBe(7);
  });
});

describe("deleting an order", () => {
  const remove = (user: Parameters<typeof authed>[0], id: string) => authed(user).delete(`/api/orders/${id}`);

  it.each([["PENDING"], ["APPROVED"]] as const)("restores stock for a %s order and fails its pending payment", async (status) => {
    const { owner, product, order } = await placeOrder(3, 10);
    await prisma.order.update({ where: { id: order.id }, data: { status } });
    await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: "PENDING" } });
    expect(await stockOf(product.id)).toBe(7);

    const res = await remove(owner, order.id);

    expect(res.status).toBe(200);
    expect(await stockOf(product.id)).toBe(10);
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe("FAILED");
  });

  it("does not restock a delivered order", async () => {
    const { owner, product, order } = await placeOrder(3, 10);
    await setStatus(owner, order.id, "COMPLETED");
    expect((await remove(owner, order.id)).status).toBe(200);
    expect(await stockOf(product.id)).toBe(7);
  });

  it("does not restock twice for an order that was already cancelled", async () => {
    const { owner, product, order } = await placeOrder(3, 10);
    await setStatus(owner, order.id, "CANCELLED");
    expect(await stockOf(product.id)).toBe(10);
    expect((await remove(owner, order.id)).status).toBe(200);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("restores stock once when a delete races a cancellation", async () => {
    const { owner, manager, product, order } = await placeOrder(3, 10);
    const results = await Promise.all([remove(owner, order.id), setStatus(manager, order.id, "CANCELLED")]);
    expect(results.every((r) => [200, 404, 409].includes(r.status))).toBe(true);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("is limited to owners and managers and scoped to the organization", async () => {
    const { cashier, auditor, order } = await placeOrder();
    const stranger = await createTenant();
    expect((await remove(cashier, order.id)).status).toBe(403);
    expect((await remove(auditor, order.id)).status).toBe(403);
    expect((await remove(stranger.owner, order.id)).status).toBe(404);
    expect(await prisma.order.count()).toBe(1);
  });
});
