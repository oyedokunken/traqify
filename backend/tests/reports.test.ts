import prisma from "../src/config/database";
import { authed, createProduct, createTenant } from "./helpers/factories";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const midLastMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 15, 12, 0, 0);
};
const utcDay = (date: Date) => date.toISOString().substring(0, 10);

/** One organization with known money, orders, stock and customers, plus a second organization that must never leak in. */
async function seedMoney() {
  const tenant = await createTenant();
  const { org, owner } = tenant;
  const other = await createTenant();

  const order = (organizationId: string, createdById: string, n: number, createdAt: Date) =>
    prisma.order.create({ data: { orderNumber: `R-${n}-${Math.random().toString(36).slice(2)}`, totalAmount: 1, organizationId, createdById, createdAt } });
  const payment = (organizationId: string, amount: number, status: "COMPLETED" | "PENDING", createdAt: Date) =>
    prisma.payment.create({ data: { amount, status, organizationId, createdAt } });

  // revenue: this month 1000 + 500, last month 2000, older 700, and a pending payment that must not count
  await payment(org.id, 1000, "COMPLETED", new Date());
  await payment(org.id, 500, "COMPLETED", new Date());
  await payment(org.id, 2000, "COMPLETED", midLastMonth());
  await payment(org.id, 700, "COMPLETED", daysAgo(75));
  await payment(org.id, 9999, "PENDING", new Date());
  await payment(other.org.id, 123456, "COMPLETED", new Date());

  await order(org.id, owner.id, 1, new Date());
  await order(org.id, owner.id, 2, new Date());
  await order(org.id, owner.id, 3, midLastMonth());
  await order(org.id, owner.id, 4, daysAgo(75));
  await order(other.org.id, other.owner.id, 5, new Date());

  // products: 3 active (stock 2 of alert 5 = low, 5 of alert 5 = low, 9 of alert 5 = fine) and 1 inactive that is out of stock
  const low = await createProduct(org.id, { stock: 2 });
  const edge = await createProduct(org.id, { stock: 5 });
  const fine = await createProduct(org.id, { stock: 9 });
  const inactive = await createProduct(org.id, { stock: 0, isActive: false });
  await prisma.inventory.updateMany({ where: { productId: { in: [low.id, edge.id, fine.id, inactive.id] } }, data: { lowStockAlert: 5 } });
  await createProduct(other.org.id, { stock: 0 });

  for (const [i, createdAt] of [daysAgo(40), daysAgo(20), daysAgo(2), new Date()].entries()) {
    await prisma.customer.create({ data: { name: `Customer ${i}`, organizationId: org.id, createdAt } });
  }
  await prisma.customer.create({ data: { name: "Other", organizationId: other.org.id } });

  return { ...tenant, other };
}

describe("overview report", () => {
  it("computes revenue, growth, counts and low stock for the organization only", async () => {
    const { org, owner } = await seedMoney();
    const res = await authed(owner).get("/api/reports/overview");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalRevenue: 4200,
      monthRevenue: 1500,
      revenueGrowth: -25,
      totalOrders: 4,
      monthOrders: 2,
      totalProducts: 3,
      totalCustomers: 4,
      lowStockCount: 2,
      storePublished: true,
      orgSlug: org.slug,
    });
  });

  it("reports null growth when last month had no revenue but this month did, and 0 when neither did", async () => {
    const { org, owner } = await createTenant();
    await prisma.payment.create({ data: { amount: 300, status: "COMPLETED", organizationId: org.id } });
    expect((await authed(owner).get("/api/reports/overview")).body.revenueGrowth).toBeNull();

    const empty = await createTenant();
    const res = await authed(empty.owner).get("/api/reports/overview");
    expect(res.body).toMatchObject({ totalRevenue: 0, monthRevenue: 0, revenueGrowth: 0, totalOrders: 0, lowStockCount: 0 });
  });

  it("rounds growth to one decimal place", async () => {
    const { org, owner } = await createTenant();
    await prisma.payment.create({ data: { amount: 1000, status: "COMPLETED", organizationId: org.id, createdAt: midLastMonth() } });
    await prisma.payment.create({ data: { amount: 1333, status: "COMPLETED", organizationId: org.id } });
    expect((await authed(owner).get("/api/reports/overview")).body.revenueGrowth).toBe(33.3);
  });

  it("is available to auditors and refused to cashiers", async () => {
    const { auditor, cashier } = await seedMoney();
    expect((await authed(auditor).get("/api/reports/overview")).status).toBe(200);
    expect((await authed(cashier).get("/api/reports/overview")).status).toBe(403);
  });
});

describe("revenue chart", () => {
  it("returns one entry per day, oldest first, with revenue and order counts for the organization only", async () => {
    const { org, owner, other } = await createTenant().then(async (t) => ({ ...t, other: await createTenant() }));
    const today = new Date();
    const threeDaysAgo = daysAgo(3);
    await prisma.payment.createMany({
      data: [
        { amount: 100, status: "COMPLETED", organizationId: org.id, createdAt: today },
        { amount: 50, status: "COMPLETED", organizationId: org.id, createdAt: today },
        { amount: 70, status: "COMPLETED", organizationId: org.id, createdAt: threeDaysAgo },
        { amount: 999, status: "PENDING", organizationId: org.id, createdAt: today },
        { amount: 5000, status: "COMPLETED", organizationId: other.org.id, createdAt: today },
        { amount: 40, status: "COMPLETED", organizationId: org.id, createdAt: daysAgo(30) },
      ],
    });
    await prisma.order.createMany({
      data: [
        { orderNumber: "RC-1", totalAmount: 1, organizationId: org.id, createdById: owner.id, createdAt: today },
        { orderNumber: "RC-2", totalAmount: 1, organizationId: org.id, createdById: owner.id, createdAt: threeDaysAgo },
        { orderNumber: "RC-3", totalAmount: 1, organizationId: org.id, createdById: owner.id, createdAt: threeDaysAgo },
        { orderNumber: "RC-4", totalAmount: 1, organizationId: other.org.id, createdById: other.owner.id, createdAt: today },
      ],
    });

    const res = await authed(owner).get("/api/reports/revenue-chart?period=7");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(7);
    expect(res.body.map((d: { date: string }) => d.date)).toEqual([...res.body.map((d: { date: string }) => d.date)].sort());
    const byDate = Object.fromEntries(res.body.map((d: { date: string; revenue: number; orders: number }) => [d.date, d]));
    expect(byDate[utcDay(today)]).toEqual({ date: utcDay(today), revenue: 150, orders: 1 });
    expect(byDate[utcDay(threeDaysAgo)]).toEqual({ date: utcDay(threeDaysAgo), revenue: 70, orders: 2 });
    const total = res.body.reduce((sum: number, d: { revenue: number }) => sum + d.revenue, 0);
    expect(total).toBe(220);
  });

  it("covers a 30 day window by default and fills empty days with zeros", async () => {
    const { owner } = await createTenant();
    const res = await authed(owner).get("/api/reports/revenue-chart");
    expect(res.body).toHaveLength(30);
    expect(res.body.every((d: { revenue: number; orders: number }) => d.revenue === 0 && d.orders === 0)).toBe(true);
  });
});

describe("customer chart", () => {
  it("returns a running total that starts from the customers who joined before the window", async () => {
    const { org, owner } = await createTenant();
    const other = await createTenant();
    const today = new Date();
    await prisma.customer.createMany({
      data: [
        { name: "Old 1", organizationId: org.id, createdAt: daysAgo(90) },
        { name: "Old 2", organizationId: org.id, createdAt: daysAgo(60) },
        { name: "In window 1", organizationId: org.id, createdAt: daysAgo(3) },
        { name: "In window 2", organizationId: org.id, createdAt: today },
        { name: "In window 3", organizationId: org.id, createdAt: today },
        { name: "Other org", organizationId: other.org.id, createdAt: today },
      ],
    });

    const res = await authed(owner).get("/api/reports/customer-chart?period=7");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(7);
    const byDate = Object.fromEntries(res.body.map((d: { date: string; customers: number }) => [d.date, d.customers]));
    expect(byDate[utcDay(daysAgo(6))]).toBe(2);
    expect(byDate[utcDay(daysAgo(3))]).toBe(3);
    expect(byDate[utcDay(today)]).toBe(5);
    expect(res.body[res.body.length - 1].customers).toBe(5);
  });
});
