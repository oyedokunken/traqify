import prisma from "../src/config/database";
import { authed, createTenant } from "./helpers/factories";

const base = { name: "Guide", sku: "GUIDE-1", description: "A guide", price: 25 };

describe("product creation keeps its type and download link", () => {
  it("stores a downloadable product's type and file", async () => {
    const { owner } = await createTenant();
    const res = await authed(owner).post("/api/products").send({
      ...base,
      productType: "DOWNLOADABLE",
      downloadUrl: "https://abc.supabase.co/storage/v1/object/public/products/guide.pdf",
    });
    expect(res.status).toBe(201);
    const stored = await prisma.product.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.productType).toBe("DOWNLOADABLE");
    expect(stored.downloadUrl).toContain("guide.pdf");
  });

  it("defaults to a simple product and drops a download link it cannot use", async () => {
    const { owner } = await createTenant();
    const res = await authed(owner).post("/api/products").send({ ...base, downloadUrl: "https://example.com/x.pdf" });
    expect(res.status).toBe(201);
    const stored = await prisma.product.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.productType).toBe("SIMPLE");
    expect(stored.downloadUrl).toBeNull();
  });

  it("rejects an unknown type and a malformed download link", async () => {
    const { owner } = await createTenant();
    expect((await authed(owner).post("/api/products").send({ ...base, productType: "BUNDLE" })).status).toBe(400);
    expect((await authed(owner).post("/api/products").send({ ...base, productType: "DOWNLOADABLE", downloadUrl: "not a url" })).status).toBe(400);
  });
});
