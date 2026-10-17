import request from "supertest";
import type { UserRole } from "@prisma/client";
import prisma from "../../src/config/database";
import app from "../../src/app";
import { signToken } from "../../src/utils/jwt";

let counter = 0;
const next = (): number => ++counter;

export async function createOrganization(
  overrides: Partial<{ name: string; slug: string; storePublished: boolean }> = {}
) {
  const n = next();
  return prisma.organization.create({
    data: {
      name: overrides.name ?? `Org ${n}`,
      slug: overrides.slug ?? `org-${n}`,
      storePublished: overrides.storePublished ?? true,
    },
  });
}

export async function createUser(
  organizationId: string | null,
  role: UserRole = "OWNER",
  overrides: Partial<{ email: string; emailVerified: boolean; isActive: boolean; password: string | null }> = {}
) {
  const n = next();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user${n}@example.com`,
      name: `User ${n}`,
      password: overrides.password === undefined ? "not-a-real-hash" : overrides.password,
      emailVerified: overrides.emailVerified ?? true,
      isActive: overrides.isActive ?? true,
      organizationId,
      role,
    },
  });
}

export async function createProduct(
  organizationId: string,
  overrides: Partial<{ name: string; price: number; stock: number; sku: string; isActive: boolean }> = {}
) {
  const n = next();
  return prisma.product.create({
    data: {
      name: overrides.name ?? `Product ${n}`,
      sku: overrides.sku ?? `SKU-${n}`,
      price: overrides.price ?? 1000,
      isActive: overrides.isActive ?? true,
      organizationId,
      inventory: { create: { quantity: overrides.stock ?? 10 } },
    },
    include: { inventory: true },
  });
}

type TokenSubject = {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  tokenVersion: number;
};

/** Builds a bearer token for a user, matching what the login endpoint issues. */
export function tokenFor(user: TokenSubject): string {
  return signToken({
    userId: user.id,
    email: user.email,
    organizationId: user.organizationId ?? undefined,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
}

/** Supertest helpers that attach the bearer token for the given user. */
export function authed(user: TokenSubject) {
  const header = `Bearer ${tokenFor(user)}`;
  return {
    get: (url: string) => request(app).get(url).set("Authorization", header),
    post: (url: string) => request(app).post(url).set("Authorization", header),
    patch: (url: string) => request(app).patch(url).set("Authorization", header),
    put: (url: string) => request(app).put(url).set("Authorization", header),
    delete: (url: string) => request(app).delete(url).set("Authorization", header),
  };
}

/** Creates an organization with one user per role. */
export async function createTenant() {
  const org = await createOrganization();
  const owner = await createUser(org.id, "OWNER");
  const manager = await createUser(org.id, "MANAGER");
  const auditor = await createUser(org.id, "AUDITOR");
  const cashier = await createUser(org.id, "CASHIER");
  return { org, owner, manager, auditor, cashier };
}
