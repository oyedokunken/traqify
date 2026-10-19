import type { UserRole } from "@prisma/client";
import prisma from "../src/config/database";
import { authed, createProduct, createTenant, createUser } from "./helpers/factories";

// Storage is an external boundary: never upload anywhere from tests.
jest.mock("../src/config/supabase", () => ({
  createSignedUpload: jest.fn().mockResolvedValue({ signedUrl: "https://storage.example.test/upload", token: "test_only_not_a_token" }),
  publicApiKey: jest.fn().mockReturnValue("test_only_not_a_key"),
  readStoredObject: jest.fn().mockResolvedValue(null),
  removeStoredObject: jest.fn().mockResolvedValue(undefined),
  publicObjectUrl: jest.fn().mockReturnValue("https://cdn.example.test/file.png"),
  createSignedDownloadUrl: jest.fn().mockResolvedValue("https://storage.example.test/signed"),
}));

type Method = "get" | "post" | "patch" | "delete";
type Ids = Awaited<ReturnType<typeof seed>>;

interface RouteCase {
  method: Method;
  /** Path with :placeholders resolved from the seeded ids. */
  path: (ids: Ids) => string;
  body?: (ids: Ids) => Record<string, unknown>;
  /** Roles that must pass authorization. Every other role must get 403. */
  allowed: UserRole[];
  /** Status the owner of a different organization must get for this route, when it targets an id. */
  crossTenant?: number;
  /** Excluded from the "AUDITOR never writes" invariant because it only sends a report. */
  readOnlyAction?: boolean;
}

const ALL: UserRole[] = ["OWNER", "MANAGER", "AUDITOR", "CASHIER"];
const OM: UserRole[] = ["OWNER", "MANAGER"];
const OMA: UserRole[] = ["OWNER", "MANAGER", "AUDITOR"];
const OMC: UserRole[] = ["OWNER", "MANAGER", "CASHIER"];
const O: UserRole[] = ["OWNER"];

async function seed() {
  const tenant = await createTenant();
  const { org, owner } = tenant;
  const product = await createProduct(org.id, { stock: 20 });
  const order = await prisma.order.create({
    data: { orderNumber: `ORD-${Date.now()}`, totalAmount: 10, status: "PENDING", organizationId: org.id, createdById: owner.id },
  });
  const customer = await prisma.customer.create({ data: { name: "Seed Customer", organizationId: org.id } });
  const payment = await prisma.payment.create({ data: { amount: 10, organizationId: org.id } });
  const category = await prisma.productCategory.create({ data: { name: "Seed", slug: "seed", organizationId: org.id } });
  const review = await prisma.review.create({
    data: { rating: 5, customerName: "R", productId: product.id, orderId: order.id, organizationId: org.id },
  });
  const invite = await prisma.staffInvite.create({
    data: { email: "invitee@example.com", role: "CASHIER", token: `tok-${Date.now()}`, expiresAt: new Date(Date.now() + 86_400_000), organizationId: org.id, invitedById: owner.id },
  });
  const audit = await prisma.auditLog.create({
    data: { action: "CREATE", entity: "Product", details: "seed", userId: owner.id, organizationId: org.id },
  });
  const subscriber = await prisma.newsletterSubscriber.create({ data: { email: "sub@example.com", organizationId: org.id } });
  // A staff member no test token belongs to, so destructive staff routes cannot break the role tokens.
  const target = await createUser(org.id, "CASHIER");
  return { ...tenant, product, order, customer, payment, category, review, invite, audit, subscriber, target };
}

const productBody = { name: "New", sku: "NEW-SKU", description: "d", price: 10 };

const routes: RouteCase[] = [
  // products
  { method: "get", path: () => "/api/products", allowed: ALL },
  { method: "get", path: (i) => `/api/products/${i.product.id}`, allowed: ALL, crossTenant: 404 },
  { method: "post", path: () => "/api/products", body: () => productBody, allowed: OM },
  { method: "patch", path: (i) => `/api/products/${i.product.id}`, body: () => ({ name: "Renamed" }), allowed: OM, crossTenant: 404 },
  { method: "delete", path: (i) => `/api/products/${i.product.id}`, allowed: OM, crossTenant: 404 },
  { method: "post", path: () => "/api/uploads/sign", body: () => ({ purpose: "PRODUCT_IMAGE", contentType: "image/png", size: 1000 }), allowed: OM },
  { method: "get", path: (i) => `/api/products/${i.product.id}/download-url`, allowed: OM, crossTenant: 404 },
  // inventory
  { method: "get", path: () => "/api/inventory", allowed: ALL },
  { method: "get", path: () => "/api/inventory/low-stock", allowed: ALL },
  { method: "patch", path: (i) => `/api/inventory/${i.product.id}`, body: () => ({ quantity: 5 }), allowed: OM, crossTenant: 404 },
  // orders
  { method: "get", path: () => "/api/orders", allowed: ALL },
  { method: "get", path: (i) => `/api/orders/${i.order.id}`, allowed: ALL, crossTenant: 404 },
  { method: "post", path: () => "/api/orders", body: (i) => ({ items: [{ productId: i.product.id, quantity: 1 }] }), allowed: OMC },
  { method: "patch", path: (i) => `/api/orders/${i.order.id}/status`, body: () => ({ status: "APPROVED" }), allowed: OM, crossTenant: 404 },
  { method: "delete", path: (i) => `/api/orders/${i.order.id}`, allowed: OM, crossTenant: 404 },
  // customers
  { method: "get", path: () => "/api/customers", allowed: ALL },
  { method: "get", path: (i) => `/api/customers/${i.customer.id}`, allowed: ALL, crossTenant: 404 },
  { method: "post", path: () => "/api/customers", body: () => ({ name: "New Customer" }), allowed: OMC },
  { method: "patch", path: (i) => `/api/customers/${i.customer.id}`, body: () => ({ name: "Renamed" }), allowed: OMC, crossTenant: 404 },
  { method: "delete", path: (i) => `/api/customers/${i.customer.id}`, allowed: OM, crossTenant: 404 },
  // categories
  { method: "get", path: () => "/api/categories", allowed: ALL },
  { method: "post", path: () => "/api/categories", body: () => ({ name: "Fresh" }), allowed: OM },
  { method: "patch", path: (i) => `/api/categories/${i.category.id}`, body: () => ({ name: "Renamed" }), allowed: OM, crossTenant: 404 },
  { method: "delete", path: (i) => `/api/categories/${i.category.id}`, allowed: OM, crossTenant: 404 },
  // payments
  { method: "get", path: () => "/api/payments", allowed: OMA },
  { method: "get", path: (i) => `/api/payments/${i.payment.id}`, allowed: OMA, crossTenant: 404 },
  { method: "post", path: () => "/api/payments", body: () => ({ amount: 5 }), allowed: OM },
  { method: "patch", path: (i) => `/api/payments/${i.payment.id}`, body: () => ({ status: "COMPLETED" }), allowed: OM, crossTenant: 404 },
  // reports
  { method: "get", path: () => "/api/reports/overview", allowed: OMA },
  { method: "get", path: () => "/api/reports/sales", allowed: OMA },
  { method: "get", path: () => "/api/reports/top-products", allowed: OMA },
  { method: "get", path: () => "/api/reports/revenue-chart", allowed: OMA },
  { method: "get", path: () => "/api/reports/customer-chart", allowed: OMA },
  { method: "get", path: () => "/api/reports/products/pdf", allowed: OMA },
  { method: "post", path: () => "/api/reports/products/email", body: () => ({ to: "accountant@example.com" }), allowed: OMA, readOnlyAction: true },
  // audit logs
  { method: "get", path: () => "/api/audit", allowed: OMA },
  { method: "get", path: () => "/api/audit/unread-count", allowed: OMA },
  { method: "get", path: (i) => `/api/audit/${i.audit.id}`, allowed: OMA, crossTenant: 404 },
  { method: "patch", path: () => "/api/audit/mark-read", allowed: OM },
  // staff
  { method: "get", path: () => "/api/staff", allowed: OMA },
  { method: "get", path: () => "/api/staff/invites", allowed: OM },
  { method: "post", path: () => "/api/staff/invite", body: () => ({ email: "fresh-invite@example.com", role: "CASHIER" }), allowed: OM },
  { method: "delete", path: (i) => `/api/staff/invites/${i.invite.id}`, allowed: OM, crossTenant: 404 },
  { method: "patch", path: (i) => `/api/staff/${i.target.id}/role`, body: () => ({ role: "AUDITOR" }), allowed: O, crossTenant: 404 },
  { method: "patch", path: (i) => `/api/staff/${i.target.id}/access`, body: () => ({ isActive: false }), allowed: OM, crossTenant: 404 },
  { method: "post", path: (i) => `/api/staff/${i.target.id}/reset-password`, allowed: OM, crossTenant: 404 },
  { method: "delete", path: (i) => `/api/staff/${i.target.id}`, allowed: O, crossTenant: 404 },
  // newsletter
  { method: "get", path: () => "/api/newsletter/subscribers", allowed: OM },
  { method: "delete", path: (i) => `/api/newsletter/${i.subscriber.id}`, allowed: OM, crossTenant: 404 },
  // reviews
  { method: "get", path: () => "/api/reviews", allowed: OM },
  { method: "patch", path: (i) => `/api/reviews/${i.review.id}/moderate`, body: () => ({ action: "approve" }), allowed: OM, crossTenant: 404 },
  { method: "delete", path: (i) => `/api/reviews/${i.review.id}`, allowed: OM, crossTenant: 404 },
  // organization
  { method: "get", path: (i) => `/api/organizations/${i.org.slug}`, allowed: ALL, crossTenant: 404 },
  { method: "patch", path: (i) => `/api/organizations/${i.org.slug}`, body: () => ({ description: "Updated" }), allowed: O, crossTenant: 404 },
];

const label = (r: RouteCase) => `${r.method.toUpperCase()} ${r.path({ product: { id: ":id" }, order: { id: ":id" }, customer: { id: ":id" }, payment: { id: ":id" }, category: { id: ":id" }, review: { id: ":id" }, invite: { id: ":id" }, audit: { id: ":id" }, subscriber: { id: ":id" }, target: { id: ":userId" }, org: { slug: ":slug" } } as unknown as Ids)}`;

function call(user: Parameters<typeof authed>[0], route: RouteCase, ids: Ids) {
  const req = authed(user)[route.method](route.path(ids));
  return route.body ? req.send(route.body(ids)) : req;
}

describe("role matrix", () => {
  it.each(routes.map((r) => [label(r), r] as const))("%s", async (_name, route) => {
    const ids = await seed();
    const users: Record<UserRole, Parameters<typeof authed>[0]> = {
      OWNER: ids.owner, MANAGER: ids.manager, AUDITOR: ids.auditor, CASHIER: ids.cashier,
    };

    // Denied roles first: allowed roles may change or delete the target.
    for (const role of ALL.filter((r) => !route.allowed.includes(r))) {
      const res = await call(users[role], route, ids);
      expect({ role, status: res.status }).toEqual({ role, status: 403 });
    }
    for (const role of route.allowed) {
      const res = await call(users[role], route, ids);
      expect({ role, authorized: res.status !== 401 && res.status !== 403 }).toEqual({ role, authorized: true });
    }
  });

  it("covers every protected router in the app", () => {
    // Guards against adding a route without adding it to the matrix: counts routes per path prefix.
    const prefixes = new Set(routes.map((r) => label(r).split(" ")[1].split("/").slice(0, 3).join("/")));
    expect([...prefixes].sort()).toEqual(
      ["/api/audit", "/api/categories", "/api/customers", "/api/inventory", "/api/newsletter", "/api/orders", "/api/organizations", "/api/payments", "/api/products", "/api/reports", "/api/reviews", "/api/staff", "/api/uploads"].sort()
    );
  });
});

describe("AUDITOR is read-only everywhere", () => {
  const writes = routes.filter((r) => r.method !== "get" && !r.readOnlyAction);

  it("is excluded from every route that creates, changes or deletes data", () => {
    for (const route of writes) {
      expect({ route: label(route), auditorAllowed: route.allowed.includes("AUDITOR") }).toEqual({ route: label(route), auditorAllowed: false });
    }
  });

  it.each(writes.map((r) => [label(r), r] as const))("%s returns 403 for an auditor and changes nothing", async (_name, route) => {
    const ids = await seed();
    const before = await snapshot();
    const res = await call(ids.auditor, route, ids);
    expect(res.status).toBe(403);
    expect(await snapshot()).toEqual(before);
  });
});

async function snapshot() {
  return {
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    payments: await prisma.payment.count(),
    categories: await prisma.productCategory.count(),
    reviews: await prisma.review.count(),
    invites: await prisma.staffInvite.count(),
    subscribers: await prisma.newsletterSubscriber.count(),
    users: await prisma.user.count(),
    stock: (await prisma.inventory.aggregate({ _sum: { quantity: true } }))._sum.quantity,
  };
}

describe("cross-tenant access", () => {
  const targeted = routes.filter((r) => r.crossTenant !== undefined);

  it.each(targeted.map((r) => [label(r), r] as const))("%s is not reachable from another organization", async (_name, route) => {
    const ids = await seed();
    const outsider = await createTenant();
    const before = await snapshot();

    // Use an outsider with the highest privilege so only tenancy can stop them.
    const res = await call(outsider.owner, route, ids);

    expect(res.status).toBe(route.crossTenant);
    const after = await snapshot();
    // The outsider's own tenant only has users; victim data must be untouched.
    expect({ ...after, users: undefined }).toEqual({ ...before, users: undefined });
  });

  it("lists never contain another organization's records", async () => {
    const victim = await seed();
    const outsider = await createTenant();

    for (const [path, key] of [
      ["/api/products", "products"],
      ["/api/orders", "orders"],
      ["/api/customers", "customers"],
      ["/api/payments", "payments"],
      ["/api/audit", "logs"],
      ["/api/reviews", "reviews"],
    ] as const) {
      const res = await authed(outsider.owner).get(path);
      expect(res.status).toBe(200);
      expect({ path, rows: res.body[key] }).toEqual({ path, rows: [] });
    }
    for (const path of ["/api/categories", "/api/inventory", "/api/newsletter/subscribers"]) {
      const res = await authed(outsider.owner).get(path);
      expect({ path, rows: res.body }).toEqual({ path, rows: [] });
    }
    const staff = await authed(outsider.owner).get("/api/staff");
    const ids = (staff.body.staff ?? staff.body).map((s: { id: string }) => s.id);
    expect(ids).not.toContain(victim.target.id);
  });

  it("a user without an organization cannot reach tenant routes", async () => {
    const loner = await createUser(null, "OWNER");
    for (const path of ["/api/products", "/api/orders", "/api/customers", "/api/payments", "/api/staff"]) {
      expect((await authed(loner).get(path)).status).toBe(403);
    }
  });

  it("unauthenticated requests are refused", async () => {
    const request = (await import("supertest")).default;
    const app = (await import("../src/app")).default;
    for (const route of routes) {
      const res = await request(app)[route.method](route.path({ product: { id: "x" }, order: { id: "x" }, customer: { id: "x" }, payment: { id: "x" }, category: { id: "x" }, review: { id: "x" }, invite: { id: "x" }, audit: { id: "x" }, subscriber: { id: "x" }, target: { id: "x" }, org: { slug: "x" } } as unknown as Ids));
      expect({ route: label(route), status: res.status }).toEqual({ route: label(route), status: 401 });
    }
  });
});
