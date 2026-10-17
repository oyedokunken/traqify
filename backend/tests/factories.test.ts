import prisma from "../src/config/database";
import { authed, createProduct, createTenant } from "./helpers/factories";

describe("test helpers", () => {
  it("creates a tenant with one user per role and an authenticated request works", async () => {
    const { org, owner } = await createTenant();
    const res = await authed(owner).get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.email ?? res.body.user?.email).toBe(owner.email);
    expect(org.id).toBe(owner.organizationId);
  });

  it("creates products with stock", async () => {
    const { org } = await createTenant();
    const product = await createProduct(org.id, { stock: 7 });
    expect(product.inventory?.quantity).toBe(7);
  });

  it("starts every test with empty tables", async () => {
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.product.count()).toBe(0);
  });
});
