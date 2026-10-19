import request from "supertest";
import prisma from "../src/config/database";
import app from "../src/app";
import { authed, createOrganization, createProduct, createTenant, createUser } from "./helpers/factories";

const customer = { name: "Ada Buyer", email: "ada@example.com", phone: "08012345678", address: "1 Test Street" };

function storeCheckout(slug: string, body: Record<string, unknown>) {
  return request(app).post(`/api/store/${slug}/checkout`).send({ ...customer, paymentMethod: "TRANSFER", ...body });
}

async function expectNothingPersisted(productId: string, expectedStock: number) {
  expect(await prisma.order.count()).toBe(0);
  expect(await prisma.payment.count()).toBe(0);
  expect(await prisma.customer.count()).toBe(0);
  const inv = await prisma.inventory.findUnique({ where: { productId } });
  expect(inv?.quantity).toBe(expectedStock);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("store checkout: quantity validation", () => {
  const badQuantities: [string, unknown][] = [
    ["negative", -1],
    ["zero", 0],
    ["fractional", 1.5],
    ["numeric string", "2"],
    ["non-numeric string", "abc"],
    ["above the maximum", 101],
    ["huge", 1e9],
    ["null", null],
    ["missing", undefined],
  ];

  it.each(badQuantities)("rejects a %s quantity with 400 and writes nothing", async (_label, quantity) => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { stock: 10 });
    const res = await storeCheckout(org.slug, { items: [{ productId: product.id, quantity }] });
    expect(res.status).toBe(400);
    await expectNothingPersisted(product.id, 10);
  });

  it("rejects an empty cart, too many items and duplicate products", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { stock: 10 });

    expect((await storeCheckout(org.slug, { items: [] })).status).toBe(400);

    const many = Array.from({ length: 51 }, () => ({ productId: product.id, quantity: 1 }));
    expect((await storeCheckout(org.slug, { items: many })).status).toBe(400);

    const dup = [
      { productId: product.id, quantity: 1 },
      { productId: product.id, quantity: 1 },
    ];
    expect((await storeCheckout(org.slug, { items: dup })).status).toBe(400);
    await expectNothingPersisted(product.id, 10);
  });

  it("rejects an invalid email", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id);
    const res = await storeCheckout(org.slug, { email: "not-an-email", items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(400);
  });
});

describe("store checkout: server-side pricing and stock", () => {
  it("computes the total from database prices and ignores client-sent prices", async () => {
    const { org } = await createTenant();
    const a = await createProduct(org.id, { price: 1500.5, stock: 10 });
    const b = await createProduct(org.id, { price: 19.99, stock: 10 });

    const res = await storeCheckout(org.slug, {
      totalAmount: 1,
      items: [
        { productId: a.id, quantity: 3, price: 1, unitPrice: 1 },
        { productId: b.id, quantity: 3, price: 1 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(4561.47);
    const order = await prisma.order.findFirstOrThrow({ include: { orderItems: true } });
    expect(order.totalAmount).toBe(4561.47);
    expect(order.orderItems.map((i) => i.unitPrice).sort((x, y) => x - y)).toEqual([19.99, 1500.5]);
    expect((await prisma.inventory.findUnique({ where: { productId: a.id } }))?.quantity).toBe(7);
    expect((await prisma.inventory.findUnique({ where: { productId: b.id } }))?.quantity).toBe(7);
  });

  it("rejects products from another organization or inactive products", async () => {
    const { org } = await createTenant();
    const other = await createOrganization();
    const foreign = await createProduct(other.id);
    const inactive = await createProduct(org.id, { isActive: false });

    expect((await storeCheckout(org.slug, { items: [{ productId: foreign.id, quantity: 1 }] })).status).toBe(400);
    expect((await storeCheckout(org.slug, { items: [{ productId: inactive.id, quantity: 1 }] })).status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("fails when ordering more than the available stock and persists nothing", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { stock: 2 });
    const res = await storeCheckout(org.slug, { items: [{ productId: product.id, quantity: 3 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stock/i);
    await expectNothingPersisted(product.id, 2);
  });

  it("treats a product with no inventory record as out of stock", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { stock: 5 });
    await prisma.inventory.delete({ where: { productId: product.id } });
    const res = await storeCheckout(org.slug, { items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("lets exactly one of two concurrent orders for the last unit succeed", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { stock: 1 });
    const body = (email: string) => ({ email, items: [{ productId: product.id, quantity: 1 }] });

    const results = await Promise.all([
      storeCheckout(org.slug, body("one@example.com")),
      storeCheckout(org.slug, body("two@example.com")),
    ]);

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 400]);
    expect(await prisma.order.count()).toBe(1);
    expect((await prisma.inventory.findUnique({ where: { productId: product.id } }))?.quantity).toBe(0);
  });
});

describe("authenticated order creation", () => {
  const badQuantities: [string, unknown][] = [
    ["negative", -1],
    ["zero", 0],
    ["fractional", 1.5],
    ["above the maximum", 101],
    ["a string", "2"],
  ];

  it.each(badQuantities)("rejects a %s quantity", async (_label, quantity) => {
    const { org, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 10 });
    const res = await authed(cashier).post("/api/orders").send({ items: [{ productId: product.id, quantity }] });
    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.inventory.findUnique({ where: { productId: product.id } }))?.quantity).toBe(10);
  });

  it("rejects duplicate products and too many items", async () => {
    const { org, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 10 });
    const dup = [
      { productId: product.id, quantity: 1 },
      { productId: product.id, quantity: 1 },
    ];
    expect((await authed(cashier).post("/api/orders").send({ items: dup })).status).toBe(400);
    const many = Array.from({ length: 51 }, () => ({ productId: product.id, quantity: 1 }));
    expect((await authed(cashier).post("/api/orders").send({ items: many })).status).toBe(400);
  });

  it("creates an order with the total computed from database prices", async () => {
    const { org, cashier } = await createTenant();
    const product = await createProduct(org.id, { price: 19.99, stock: 10 });
    const res = await authed(cashier).post("/api/orders").send({ items: [{ productId: product.id, quantity: 3 }], totalAmount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe(59.97);
    expect((await prisma.inventory.findUnique({ where: { productId: product.id } }))?.quantity).toBe(7);
    expect((await prisma.payment.findFirstOrThrow()).amount).toBe(59.97);
  });

  it("fails on insufficient stock with no writes", async () => {
    const { org, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 1 });
    const res = await authed(cashier).post("/api/orders").send({ items: [{ productId: product.id, quantity: 2 }] });
    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.payment.count()).toBe(0);
    expect((await prisma.inventory.findUnique({ where: { productId: product.id } }))?.quantity).toBe(1);
  });

  it("lets exactly one of two concurrent orders for the last unit succeed", async () => {
    const { org, cashier, manager } = await createTenant();
    const product = await createProduct(org.id, { stock: 1 });
    const body = { items: [{ productId: product.id, quantity: 1 }] };
    const results = await Promise.all([
      authed(cashier).post("/api/orders").send(body),
      authed(manager).post("/api/orders").send(body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await prisma.order.count()).toBe(1);
    expect((await prisma.inventory.findUnique({ where: { productId: product.id } }))?.quantity).toBe(0);
  });

  it("does not let a user order another organization's product", async () => {
    const { cashier } = await createTenant();
    const other = await createOrganization();
    await createUser(other.id, "OWNER");
    const foreign = await createProduct(other.id, { stock: 5 });
    const res = await authed(cashier).post("/api/orders").send({ items: [{ productId: foreign.id, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect((await prisma.inventory.findUnique({ where: { productId: foreign.id } }))?.quantity).toBe(5);
  });
});

describe("checkout tenancy", () => {
  it("does not accept orders for an unpublished store", async () => {
    const org = await createOrganization({ storePublished: false });
    await createUser(org.id, "OWNER");
    const product = await createProduct(org.id, { stock: 5 });
    const res = await storeCheckout(org.slug, { items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(404);
    expect(await prisma.order.count()).toBe(0);
  });

  it("rejects a customerId that belongs to another organization", async () => {
    const { org, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 5 });
    const other = await createOrganization();
    const foreignCustomer = await prisma.customer.create({ data: { name: "Other", organizationId: other.id } });
    const res = await authed(cashier)
      .post("/api/orders")
      .send({ customerId: foreignCustomer.id, items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.inventory.findUnique({ where: { productId: product.id } }))?.quantity).toBe(5);
  });
});
