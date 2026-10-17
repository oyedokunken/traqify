import prisma from "../src/config/database";
import { MAX_PAGE_SIZE, parsePagination } from "../src/utils/pagination";
import { authed, createProduct, createTenant } from "./helpers/factories";

describe("parsePagination", () => {
  it("uses the defaults when nothing is supplied", () => {
    expect(parsePagination({}, 25)).toEqual({ page: 1, limit: 25, skip: 0, take: 25 });
    expect(parsePagination(undefined, 50)).toMatchObject({ page: 1, limit: 50 });
  });

  it("coerces numeric strings and computes skip", () => {
    expect(parsePagination({ page: "3", limit: "20" })).toEqual({ page: 3, limit: 20, skip: 40, take: 20 });
  });

  it("caps the limit at the maximum", () => {
    expect(parsePagination({ limit: "1000" }).limit).toBe(MAX_PAGE_SIZE);
    expect(parsePagination({ limit: "1e9" }).limit).toBe(MAX_PAGE_SIZE);
    expect(parsePagination({ limit: "99999999999" }).limit).toBe(MAX_PAGE_SIZE);
  });

  it.each([["NaN"], ["abc"], ["-5"], ["0"], ["1.5"], [""], ["Infinity"]])("falls back to defaults for %p", (value) => {
    expect(parsePagination({ page: value, limit: value }, 25)).toMatchObject({ page: 1, limit: 25, skip: 0 });
  });

  it("ignores arrays and objects smuggled through the query string", () => {
    expect(parsePagination({ page: ["2", "3"], limit: { a: 1 } }, 25)).toMatchObject({ page: 1, limit: 25 });
  });
});

describe("list endpoints are bounded", () => {
  async function seedProducts(organizationId: string, count: number) {
    await prisma.product.createMany({
      data: Array.from({ length: count }, (_, i) => ({ name: `P${i}`, sku: `SKU-${i}`, price: 10, organizationId })),
    });
  }

  it("caps product pages at 100 rows", async () => {
    const { org, owner } = await createTenant();
    await seedProducts(org.id, 120);
    const res = await authed(owner).get("/api/products?limit=1000");
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(100);
    expect(res.body.total).toBe(120);
  });

  it.each([["limit=abc"], ["limit=-1"], ["limit=0"], ["page=-4"], ["page=NaN&limit=NaN"]])("falls back to defaults for %s", async (query) => {
    const { org, owner } = await createTenant();
    await seedProducts(org.id, 60);
    const res = await authed(owner).get(`/api/products?${query}`);
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(50);
  });

  it("returns the requested page", async () => {
    const { org, owner } = await createTenant();
    await seedProducts(org.id, 25);
    const first = await authed(owner).get("/api/products?limit=10&page=1");
    const third = await authed(owner).get("/api/products?limit=10&page=3");
    expect(first.body.products).toHaveLength(10);
    expect(third.body.products).toHaveLength(5);
  });

  it("caps customers, payments and audit logs", async () => {
    const { org, owner } = await createTenant();
    await prisma.customer.createMany({ data: Array.from({ length: 105 }, (_, i) => ({ name: `C${i}`, organizationId: org.id })) });
    await prisma.payment.createMany({ data: Array.from({ length: 105 }, () => ({ amount: 1, organizationId: org.id })) });
    await prisma.auditLog.createMany({
      data: Array.from({ length: 105 }, () => ({ action: "CREATE", entity: "Product", details: "x", userId: owner.id, organizationId: org.id })),
    });

    expect((await authed(owner).get("/api/customers?limit=500")).body.customers).toHaveLength(100);
    expect((await authed(owner).get("/api/payments?limit=500")).body.payments).toHaveLength(100);
    expect((await authed(owner).get("/api/audit?limit=500")).body.logs).toHaveLength(100);
  });

  it("caps the top products report", async () => {
    const { owner } = await createTenant();
    expect((await authed(owner).get("/api/reports/top-products?limit=abc")).status).toBe(200);
    expect((await authed(owner).get("/api/reports/top-products?limit=100000")).status).toBe(200);
  });
});

describe("order list totals", () => {
  it("counts only what a cashier can see", async () => {
    const { org, owner, cashier } = await createTenant();
    const product = await createProduct(org.id, { stock: 50 });
    const body = { items: [{ productId: product.id, quantity: 1 }] };
    await authed(owner).post("/api/orders").send(body).expect(201);
    await authed(owner).post("/api/orders").send(body).expect(201);
    await authed(cashier).post("/api/orders").send(body).expect(201);

    const asCashier = await authed(cashier).get("/api/orders");
    const asOwner = await authed(owner).get("/api/orders");

    expect(asCashier.body.orders).toHaveLength(1);
    expect(asCashier.body.total).toBe(1);
    expect(asOwner.body.total).toBe(3);
  });

  it("rejects an unknown status filter instead of failing with a server error", async () => {
    const { owner } = await createTenant();
    expect((await authed(owner).get("/api/orders?status=SHIPPED")).status).toBe(400);
    expect((await authed(owner).get("/api/orders?status=APPROVED")).status).toBe(200);
  });

  it("caps the page size", async () => {
    const { org, owner } = await createTenant();
    await prisma.order.createMany({
      data: Array.from({ length: 105 }, (_, i) => ({ orderNumber: `ORD-${i}`, totalAmount: 1, organizationId: org.id, createdById: owner.id })),
    });
    const res = await authed(owner).get("/api/orders?limit=9999");
    expect(res.body.orders).toHaveLength(100);
    expect(res.body.limit).toBe(100);
    expect(res.body.total).toBe(105);
  });
});
