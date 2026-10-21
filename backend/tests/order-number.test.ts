import prisma from "../src/config/database";
import * as orderNumber from "../src/utils/order-number";
import { authed, createProduct, createTenant } from "./helpers/factories";

afterEach(() => {
  jest.restoreAllMocks();
});

async function seedExistingOrder(organizationId: string, createdById: string, number: string) {
  await prisma.order.create({ data: { orderNumber: number, totalAmount: 1, organizationId, createdById } });
}

describe("generated order numbers", () => {
  it("have the prefix, a timestamp and random part, and do not repeat in a burst", () => {
    const numbers = Array.from({ length: 5000 }, () => orderNumber.generateOrderNumber("ORD"));
    expect(numbers[0]).toMatch(/^ORD-[0-9A-Z]+-[0-9A-F]{10}$/);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe("placing an order when the generated number is already taken", () => {
  it("tries again with a new number and places the order once", async () => {
    const { org, owner, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 10 });
    await seedExistingOrder(org.id, owner.id, "ORD-TAKEN-1");
    const real = orderNumber.generateOrderNumber;
    jest.spyOn(orderNumber, "generateOrderNumber").mockReturnValueOnce("ORD-TAKEN-1").mockImplementation(real);

    const res = await authed(cashier).post("/api/orders").send({ items: [{ productId: product.id, quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.orderNumber).not.toBe("ORD-TAKEN-1");
    expect(await prisma.order.count({ where: { organizationId: org.id } })).toBe(2);
    // The failed first attempt rolled back, so stock went down once, not twice.
    expect((await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } })).quantity).toBe(8);
    expect(await prisma.payment.count({ where: { organizationId: org.id } })).toBe(1);
  });

  it("gives up cleanly after repeated collisions without leaving a half placed order", async () => {
    const { org, owner, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 10 });
    await seedExistingOrder(org.id, owner.id, "ORD-TAKEN-2");
    const spy = jest.spyOn(orderNumber, "generateOrderNumber").mockReturnValue("ORD-TAKEN-2");

    const res = await authed(cashier).post("/api/orders").send({ items: [{ productId: product.id, quantity: 2 }] });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/try again/i);
    expect(spy.mock.calls.length).toBeGreaterThan(1);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(5);
    expect(await prisma.order.count({ where: { organizationId: org.id } })).toBe(1);
    expect((await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } })).quantity).toBe(10);
    expect(await prisma.payment.count({ where: { organizationId: org.id } })).toBe(0);
  });

  it("gives parallel orders distinct numbers", async () => {
    const { org, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 50 });

    const results = await Promise.all(
      Array.from({ length: 12 }, () => authed(cashier).post("/api/orders").send({ items: [{ productId: product.id, quantity: 1 }] }))
    );

    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(new Set(results.map((r) => r.body.orderNumber)).size).toBe(12);
  });
});
