import request from "supertest";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import prisma from "../src/config/database";
import app from "../src/app";
import { createSignedDownloadUrl } from "../src/config/supabase";
import { buildDownloadLink, verifyDownloadLink } from "../src/utils/downloads";
import { authed, createOrganization, createProduct, createTenant, createUser } from "./helpers/factories";
import { sentMail } from "./helpers/mail";

// Storage is an external boundary: nothing in these tests talks to Supabase.
jest.mock("../src/config/supabase", () => ({
  createSignedUpload: jest.fn(),
  publicApiKey: jest.fn().mockReturnValue("test_only_not_a_key"),
  readStoredObject: jest.fn(),
  removeStoredObject: jest.fn().mockResolvedValue(undefined),
  publicObjectUrl: jest.fn(),
  createSignedDownloadUrl: jest.fn(),
}));

const mockedSignedUrl = createSignedDownloadUrl as jest.Mock;
const SIGNED = "https://storage.example.test/object/sign/downloadables/file.pdf?token=test_only_not_a_token";

beforeEach(() => {
  mockedSignedUrl.mockResolvedValue(SIGNED);
});

/** A store with one downloadable product and one order for it. */
async function purchase(opts: { status?: OrderStatus; payments?: PaymentStatus[]; downloadUrl?: string } = {}) {
  const tenant = await createTenant();
  const product = await createProduct(tenant.org.id, { price: 1000 });
  const downloadUrl = opts.downloadUrl ?? `storage:${tenant.org.id}/downloadable/book.pdf`;
  await prisma.product.update({ where: { id: product.id }, data: { productType: "DOWNLOADABLE", downloadUrl } });
  const customer = await prisma.customer.create({ data: { name: "Buyer", email: "buyer@example.com", organizationId: tenant.org.id } });
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Math.random().toString(36).slice(2)}`,
      totalAmount: 1000,
      status: opts.status ?? "COMPLETED",
      organizationId: tenant.org.id,
      createdById: tenant.owner.id,
      customerId: customer.id,
      orderItems: { create: [{ productId: product.id, quantity: 1, unitPrice: 1000, subtotal: 1000 }] },
    },
  });
  for (const status of opts.payments ?? ["COMPLETED"]) {
    await prisma.payment.create({ data: { amount: 1000, status, organizationId: tenant.org.id, orderId: order.id } });
  }
  return { ...tenant, product, order, link: buildDownloadLink(tenant.org.slug, order.id, product.id) };
}

/** Requests a link the way a browser would, as a path on the API. */
const open = (link: string) => {
  const url = new URL(link);
  return request(app).get(url.pathname + url.search);
};

describe("a valid purchase", () => {
  it("redirects to a short lived signed URL for the private file", async () => {
    const { link, org } = await purchase();
    const res = await open(link);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(SIGNED);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(mockedSignedUrl).toHaveBeenCalledWith("downloadables", `${org.id}/downloadable/book.pdf`, 60);
  });

  it("sends the buyer to the owner's own https link for an external file without signing anything", async () => {
    const { link } = await purchase({ downloadUrl: "https://files.example.com/book.pdf" });
    const res = await open(link);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://files.example.com/book.pdf");
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });

  it("still works for a completed order that has no payment record", async () => {
    const { link } = await purchase({ payments: [] });
    expect((await open(link)).status).toBe(302);
  });

  it("works when one of several payments is completed", async () => {
    const { link } = await purchase({ payments: ["FAILED", "COMPLETED"] });
    expect((await open(link)).status).toBe(302);
  });
});

describe("no order", () => {
  it("returns 404 when the order does not contain the product", async () => {
    const { org, order, owner } = await purchase();
    const other = await createProduct(org.id);
    await prisma.product.update({ where: { id: other.id }, data: { productType: "DOWNLOADABLE", downloadUrl: `storage:${org.id}/downloadable/other.pdf` } });
    const link = buildDownloadLink(org.slug, order.id, other.id);

    const res = await open(link);
    expect(res.status).toBe(404);
    expect(mockedSignedUrl).not.toHaveBeenCalled();
    expect(owner.id).toBeDefined();
  });

  it("returns 404 for an order that does not exist", async () => {
    const { org, product } = await purchase();
    expect((await open(buildDownloadLink(org.slug, "no-such-order", product.id))).status).toBe(404);
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 404 for a store that does not exist", async () => {
    const { order, product } = await purchase();
    expect((await open(buildDownloadLink("no-such-store", order.id, product.id))).status).toBe(404);
  });
});

describe("an order that is not paid for and delivered", () => {
  it.each([["PENDING"], ["APPROVED"], ["CANCELLED"]] as const)("is refused while the order is %s", async (status) => {
    const { link } = await purchase({ status, payments: ["PENDING"] });
    const res = await open(link);
    expect(res.status).toBe(403);
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });

  it.each([[["REFUNDED"]], [["FAILED"]], [["REFUNDED", "FAILED"]]] as const)("is refused when every payment is %j", async (payments) => {
    const { link } = await purchase({ payments: [...payments] });
    expect((await open(link)).status).toBe(403);
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });

  it("stops working if the order is cancelled after the email was sent", async () => {
    const { link, order } = await purchase();
    expect((await open(link)).status).toBe(302);
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    expect((await open(link)).status).toBe(403);
  });
});

describe("the wrong organization", () => {
  it("does not serve a link under another store's address", async () => {
    const { order, product } = await purchase();
    const other = await createOrganization();
    const forged = buildDownloadLink(other.slug, order.id, product.id);

    const res = await open(forged);
    expect(res.status).toBe(404);
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });

  it("never signs a file that belongs to another organization's product", async () => {
    const mine = await purchase();
    const theirs = await purchase({ downloadUrl: "storage:their-org/downloadable/secret.pdf" });
    // A link for my order but their product id: the product is not in my order.
    expect((await open(buildDownloadLink(mine.org.slug, mine.order.id, theirs.product.id))).status).toBe(404);
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });
});

describe("link integrity", () => {
  it("rejects a tampered signature, a changed expiry and missing parameters", async () => {
    const { link } = await purchase();
    const url = new URL(link);
    const sig = url.searchParams.get("sig")!;
    const exp = url.searchParams.get("exp")!;

    for (const query of [
      `exp=${exp}&sig=${sig.slice(0, -2)}xx`,
      `exp=${Number(exp) + 1000}&sig=${sig}`,
      `exp=${exp}`,
      `sig=${sig}`,
      "",
      `exp=abc&sig=${sig}`,
    ]) {
      const res = await request(app).get(`${url.pathname}?${query}`);
      expect({ query, status: res.status }).toEqual({ query, status: 403 });
    }
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects a signature issued for another product", async () => {
    const a = await purchase();
    const b = await purchase();
    const sig = new URL(a.link).searchParams.get("sig")!;
    const exp = new URL(a.link).searchParams.get("exp")!;
    const res = await request(app).get(`/api/store/${b.org.slug}/downloads/${b.order.id}/${b.product.id}?exp=${exp}&sig=${sig}`);
    expect(res.status).toBe(403);
  });

  it("expires after thirty days", async () => {
    const { org, order, product } = await purchase();
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const old = new URL(buildDownloadLink(org.slug, order.id, product.id, thirtyOneDaysAgo));
    expect(verifyDownloadLink(order.id, product.id, old.searchParams.get("exp"), old.searchParams.get("sig"))).toBe(false);
    expect((await request(app).get(old.pathname + old.search)).status).toBe(403);
  });

  it("points at the frontend origin so it passes through the proxy", async () => {
    const { link } = await purchase();
    expect(link.startsWith("http://localhost:3000/api/store/")).toBe(true);
  });

  it("returns 404 when the product is not downloadable", async () => {
    const { link, product } = await purchase();
    await prisma.product.update({ where: { id: product.id }, data: { productType: "SIMPLE" } });
    expect((await open(link)).status).toBe(404);
  });
});

describe("owner preview", () => {
  it("lets an owner or manager open their own file, and nobody else", async () => {
    const { owner, manager, cashier, auditor, product } = await purchase();
    const path = `/api/products/${product.id}/download-url`;
    expect((await authed(cashier).get(path)).status).toBe(403);
    expect((await authed(auditor).get(path)).status).toBe(403);

    const res = await authed(owner).get(path);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: SIGNED, expiresInSeconds: 60 });
    expect((await authed(manager).get(path)).status).toBe(200);
  });

  it("does not reach another organization's product", async () => {
    const { product } = await purchase();
    const stranger = await createTenant();
    expect((await authed(stranger.owner).get(`/api/products/${product.id}/download-url`)).status).toBe(404);
    expect(mockedSignedUrl).not.toHaveBeenCalled();
  });
});

describe("delivery email", () => {
  it("contains signed links, never the file's address or an attachment", async () => {
    const { org, owner, order, product } = await purchase({ status: "APPROVED", payments: ["COMPLETED"] });

    const res = await authed(owner).patch(`/api/orders/${order.id}/status`).send({ status: "COMPLETED" });
    expect(res.status).toBe(200);

    const mail = sentMail().find((m) => m.to === "buyer@example.com" && /delivered/i.test(m.subject));
    expect(mail).toBeDefined();
    expect(mail!.html).toContain(`/api/store/${org.slug}/downloads/${order.id}/${product.id}?exp=`);
    expect(mail!.html).not.toContain("storage:");
    expect(mail!.html).not.toContain("book.pdf");

    const link = mail!.html.match(/href="([^"]*\/downloads\/[^"]+)"/)![1].replace(/&amp;/g, "&");
    expect((await open(link)).status).toBe(302);
  });
});

describe("product file references", () => {
  const base = { name: "Guide", sku: "GUIDE-X", description: "d", price: 25, productType: "DOWNLOADABLE" };

  async function confirmedUpload(organizationId: string, userId: string, status: "CONFIRMED" | "PENDING" = "CONFIRMED") {
    return prisma.upload.create({
      data: {
        bucket: "downloadables",
        path: `${organizationId}/downloadable/${Math.random().toString(36).slice(2)}.pdf`,
        purpose: "DOWNLOADABLE",
        status,
        declaredType: "application/pdf",
        maxBytes: 1000,
        expiresAt: new Date(Date.now() + 60_000),
        userId,
        organizationId,
      },
    });
  }

  it("accepts the reference of a file this organization uploaded and the server confirmed", async () => {
    const { org, owner } = await createTenant();
    const upload = await confirmedUpload(org.id, owner.id);
    const res = await authed(owner).post("/api/products").send({ ...base, downloadUrl: `storage:${upload.path}` });
    expect(res.status).toBe(201);
    expect(res.body.downloadUrl).toBe(`storage:${upload.path}`);
  });

  it("rejects a reference to an unconfirmed upload, another organization's file or a made up path", async () => {
    const { org, owner } = await createTenant();
    const other = await createTenant();
    const pending = await confirmedUpload(org.id, owner.id, "PENDING");
    const foreign = await confirmedUpload(other.org.id, other.owner.id);

    for (const downloadUrl of [`storage:${pending.path}`, `storage:${foreign.path}`, `storage:${org.id}/downloadable/invented.pdf`]) {
      const res = await authed(owner).post("/api/products").send({ ...base, sku: Math.random().toString(36).slice(2), downloadUrl });
      expect({ downloadUrl: downloadUrl.slice(0, 12), status: res.status }).toEqual({ downloadUrl: downloadUrl.slice(0, 12), status: 400 });
    }
    expect(await prisma.product.count()).toBe(0);
  });

  it("applies the same rule when updating a product", async () => {
    const { org, owner } = await createTenant();
    const other = await createTenant();
    const foreign = await confirmedUpload(other.org.id, other.owner.id);
    const product = await createProduct(org.id);

    expect((await authed(owner).patch(`/api/products/${product.id}`).send({ downloadUrl: `storage:${foreign.path}` })).status).toBe(400);
    const own = await confirmedUpload(org.id, owner.id);
    expect((await authed(owner).patch(`/api/products/${product.id}`).send({ downloadUrl: `storage:${own.path}` })).status).toBe(200);
  });

  it("accepts an https link but not other schemes", async () => {
    const { owner } = await createTenant();
    expect((await authed(owner).post("/api/products").send({ ...base, sku: "A-1", downloadUrl: "https://files.example.com/a.pdf" })).status).toBe(201);
    for (const downloadUrl of ["http://files.example.com/a.pdf", "ftp://files.example.com/a.pdf", "javascript:alert(1)", "file:///etc/passwd", "not a url"]) {
      const res = await authed(owner).post("/api/products").send({ ...base, sku: Math.random().toString(36).slice(2), downloadUrl });
      expect({ downloadUrl, status: res.status }).toEqual({ downloadUrl, status: 400 });
    }
    void createUser;
  });
});
