import prisma from "../src/config/database";
import { authed, createOrganization, createProduct, createTenant } from "./helpers/factories";

async function categoryFor(organizationId: string, name = "Cat") {
  return prisma.productCategory.create({ data: { name, slug: name.toLowerCase(), organizationId } });
}

describe("product update only changes allow-listed fields", () => {
  it("ignores organizationId, id and other protected fields", async () => {
    const { org, owner } = await createTenant();
    const other = await createOrganization();
    const product = await createProduct(org.id, { name: "Original", price: 100 });

    const res = await authed(owner).patch(`/api/products/${product.id}`).send({
      name: "Renamed",
      organizationId: other.id,
      id: "hijacked-id",
      slug: "hijacked-slug",
      createdAt: "2000-01-01T00:00:00.000Z",
    });

    expect(res.status).toBe(200);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.name).toBe("Renamed");
    expect(after.organizationId).toBe(org.id);
    expect(after.slug).toBe(product.slug);
    expect(after.createdAt.getFullYear()).not.toBe(2000);
    expect(await prisma.product.count({ where: { organizationId: other.id } })).toBe(0);
  });

  it("updates the editable fields", async () => {
    const { org, owner } = await createTenant();
    const product = await createProduct(org.id);
    const res = await authed(owner).patch(`/api/products/${product.id}`).send({ price: 19.999, isActive: false, status: "draft" });
    expect(res.status).toBe(200);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.price).toBe(20);
    expect(after.isActive).toBe(false);
    expect(after.status).toBe("draft");
  });

  it.each([[-5], [0], ["abc"], [null]])("rejects an invalid price %p", async (price) => {
    const { org, owner } = await createTenant();
    const product = await createProduct(org.id, { price: 100 });
    const res = await authed(owner).patch(`/api/products/${product.id}`).send({ price });
    expect(res.status).toBe(400);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).price).toBe(100);
  });

  it("rejects a categoryId from another organization on update and on create", async () => {
    const { org, owner } = await createTenant();
    const other = await createOrganization();
    const foreign = await categoryFor(other.id);
    const product = await createProduct(org.id);

    const update = await authed(owner).patch(`/api/products/${product.id}`).send({ categoryId: foreign.id });
    expect(update.status).toBe(400);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).categoryId).toBeNull();

    const create = await authed(owner).post("/api/products").send({
      name: "New", sku: "NEW-1", description: "d", price: 10, categoryId: foreign.id,
    });
    expect(create.status).toBe(400);
  });

  it("accepts a category from the same organization", async () => {
    const { org, owner } = await createTenant();
    const own = await categoryFor(org.id);
    const product = await createProduct(org.id);
    const res = await authed(owner).patch(`/api/products/${product.id}`).send({ categoryId: own.id });
    expect(res.status).toBe(200);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).categoryId).toBe(own.id);
  });

  it("cannot update another organization's product, and cashiers cannot update at all", async () => {
    const { org, owner, cashier } = await createTenant();
    const other = await createOrganization();
    const foreign = await createProduct(other.id, { name: "Theirs" });
    const own = await createProduct(org.id);

    expect((await authed(owner).patch(`/api/products/${foreign.id}`).send({ name: "Stolen" })).status).toBe(404);
    expect((await authed(cashier).patch(`/api/products/${own.id}`).send({ name: "Nope" })).status).toBe(403);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: foreign.id } })).name).toBe("Theirs");
  });
});

describe("customer update only changes allow-listed fields", () => {
  it("ignores organizationId, source and id", async () => {
    const { org, owner } = await createTenant();
    const other = await createOrganization();
    const customer = await prisma.customer.create({ data: { name: "Before", organizationId: org.id, source: "MANUAL" } });

    const res = await authed(owner).patch(`/api/customers/${customer.id}`).send({
      name: "After",
      phone: "0801",
      organizationId: other.id,
      source: "PURCHASE",
      id: "hijacked-id",
    });

    expect(res.status).toBe(200);
    const after = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } });
    expect(after.name).toBe("After");
    expect(after.phone).toBe("0801");
    expect(after.organizationId).toBe(org.id);
    expect(after.source).toBe("MANUAL");
  });

  it("validates the fields it does accept", async () => {
    const { org, owner } = await createTenant();
    const customer = await prisma.customer.create({ data: { name: "Before", organizationId: org.id } });
    expect((await authed(owner).patch(`/api/customers/${customer.id}`).send({ email: "not-an-email" })).status).toBe(400);
    expect((await authed(owner).patch(`/api/customers/${customer.id}`).send({ name: "" })).status).toBe(400);
  });

  it("cannot update another organization's customer", async () => {
    const { owner } = await createTenant();
    const other = await createOrganization();
    const foreign = await prisma.customer.create({ data: { name: "Theirs", organizationId: other.id } });
    expect((await authed(owner).patch(`/api/customers/${foreign.id}`).send({ name: "Stolen" })).status).toBe(404);
  });
});
