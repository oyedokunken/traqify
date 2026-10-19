import request from "supertest";
import type { UserRole, UploadPurpose } from "@prisma/client";
import prisma from "../src/config/database";
import app from "../src/app";
import { createSignedUpload, readStoredObject, removeStoredObject } from "../src/config/supabase";
import { authed, createOrganization, createTenant, createUser } from "./helpers/factories";

// Storage is an external boundary: nothing in these tests talks to Supabase.
jest.mock("../src/config/supabase", () => ({
  createSignedUpload: jest.fn(),
  publicApiKey: jest.fn().mockReturnValue("test_only_not_a_key"),
  readStoredObject: jest.fn(),
  removeStoredObject: jest.fn().mockResolvedValue(undefined),
  publicObjectUrl: jest.fn((bucket: string, path: string) => `https://cdn.example.test/${bucket}/${path}`),
  createSignedDownloadUrl: jest.fn(),
}));

const mockedSign = createSignedUpload as jest.Mock;
const mockedRead = readStoredObject as jest.Mock;
const mockedRemove = removeStoredObject as jest.Mock;

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(64)]);
const HTML = Buffer.from("<!DOCTYPE html><script>alert(document.cookie)</script>");
const MB = 1024 * 1024;

beforeEach(() => {
  mockedSign.mockResolvedValue({ signedUrl: "https://storage.example.test/upload?token=test_only_not_a_token", token: "test_only_not_a_token" });
  mockedRead.mockResolvedValue(null);
});

const sign = (user: Parameters<typeof authed>[0], body: Record<string, unknown>) => authed(user).post("/api/uploads/sign").send(body);
const confirm = (user: Parameters<typeof authed>[0], id: string) => authed(user).post(`/api/uploads/${id}/confirm`).send({});

async function signedUpload(user: Parameters<typeof authed>[0], purpose: UploadPurpose, contentType: string, size = 100) {
  const res = await sign(user, { purpose, contentType, size });
  expect(res.status).toBe(201);
  return res.body as { uploadId: string };
}

describe("signing an upload", () => {
  it("requires authentication", async () => {
    const res = await request(app).post("/api/uploads/sign").send({ purpose: "AVATAR", contentType: "image/png", size: 10 });
    expect(res.status).toBe(401);
    expect(mockedSign).not.toHaveBeenCalled();
  });

  const roleCases: [UploadPurpose, UserRole[]][] = [
    ["AVATAR", ["OWNER", "MANAGER", "CASHIER", "AUDITOR"]],
    ["ORG_LOGO", ["OWNER"]],
    ["PRODUCT_IMAGE", ["OWNER", "MANAGER"]],
    ["DOWNLOADABLE", ["OWNER", "MANAGER"]],
  ];

  it.each(roleCases)("%s may be uploaded only by the permitted roles", async (purpose, allowed) => {
    const tenant = await createTenant();
    const users: Record<UserRole, Parameters<typeof authed>[0]> = { OWNER: tenant.owner, MANAGER: tenant.manager, AUDITOR: tenant.auditor, CASHIER: tenant.cashier };
    const contentType = purpose === "DOWNLOADABLE" ? "application/pdf" : "image/png";
    for (const role of ["OWNER", "MANAGER", "AUDITOR", "CASHIER"] as UserRole[]) {
      const res = await sign(users[role], { purpose, contentType, size: 100 });
      expect({ role, status: res.status }).toEqual({ role, status: allowed.includes(role) ? 201 : 403 });
    }
  });

  it("lets a user without an organization upload an avatar but nothing tied to an organization", async () => {
    const loner = await createUser(null, "OWNER");
    expect((await sign(loner, { purpose: "AVATAR", contentType: "image/png", size: 10 })).status).toBe(201);
    for (const purpose of ["ORG_LOGO", "PRODUCT_IMAGE", "DOWNLOADABLE"]) {
      expect((await sign(loner, { purpose, contentType: "image/png", size: 10 })).status).toBe(403);
    }
  });

  it.each([
    ["AVATAR", "application/pdf"],
    ["AVATAR", "image/gif"],
    ["AVATAR", "image/svg+xml"],
    ["AVATAR", "text/html"],
    ["PRODUCT_IMAGE", "application/octet-stream"],
    ["DOWNLOADABLE", "application/octet-stream"],
    ["DOWNLOADABLE", "application/x-msdownload"],
    ["DOWNLOADABLE", "text/html"],
    ["DOWNLOADABLE", "application/javascript"],
  ] as [UploadPurpose, string][])("refuses %s with content type %s", async (purpose, contentType) => {
    const { owner } = await createTenant();
    const res = await sign(owner, { purpose, contentType, size: 100 });
    expect(res.status).toBe(400);
    expect(mockedSign).not.toHaveBeenCalled();
    expect(await prisma.upload.count()).toBe(0);
  });

  it.each([[0], [-5], [1.5], ["100"], [null]])("refuses size %p", async (size) => {
    const { owner } = await createTenant();
    expect((await sign(owner, { purpose: "AVATAR", contentType: "image/png", size })).status).toBe(400);
  });

  it("enforces the size limit for each purpose", async () => {
    const { owner } = await createTenant();
    expect((await sign(owner, { purpose: "PRODUCT_IMAGE", contentType: "image/png", size: 5 * MB })).status).toBe(201);
    expect((await sign(owner, { purpose: "PRODUCT_IMAGE", contentType: "image/png", size: 5 * MB + 1 })).status).toBe(400);
    expect((await sign(owner, { purpose: "DOWNLOADABLE", contentType: "application/pdf", size: 25 * MB })).status).toBe(201);
    expect((await sign(owner, { purpose: "DOWNLOADABLE", contentType: "application/pdf", size: 25 * MB + 1 })).status).toBe(400);
  });

  it("chooses the bucket and path itself and ignores anything the client suggests", async () => {
    const { org, owner } = await createTenant();
    const res = await sign(owner, {
      purpose: "PRODUCT_IMAGE",
      contentType: "image/png",
      size: 100,
      bucket: "downloadables",
      path: "../../other-org/secret.pdf",
      filename: "../../evil.html",
    });

    expect(res.status).toBe(201);
    const [bucket, path] = mockedSign.mock.calls[0];
    expect(bucket).toBe("products");
    expect(path).toMatch(new RegExp(`^${org.id}/product-image/[0-9a-f-]{36}\\.png$`));
    const row = await prisma.upload.findUniqueOrThrow({ where: { id: res.body.uploadId } });
    expect(row).toMatchObject({ bucket: "products", path, status: "PENDING", organizationId: org.id, userId: owner.id, declaredType: "image/png" });
    expect(res.body).toMatchObject({ signedUrl: expect.stringContaining("https://"), apiKey: "test_only_not_a_key", maxBytes: 5 * MB });
  });

  it("keeps avatars under the user and downloads in the private bucket", async () => {
    const { owner } = await createTenant();
    await sign(owner, { purpose: "AVATAR", contentType: "image/webp", size: 10 });
    await sign(owner, { purpose: "DOWNLOADABLE", contentType: "application/epub+zip", size: 10 });
    expect(mockedSign.mock.calls[0][0]).toBe("avatars");
    expect(mockedSign.mock.calls[0][1]).toMatch(new RegExp(`^users/${owner.id}/avatar/[0-9a-f-]{36}\\.webp$`));
    expect(mockedSign.mock.calls[1][0]).toBe("downloadables");
    expect(mockedSign.mock.calls[1][1]).toMatch(/\/downloadable\/[0-9a-f-]{36}\.epub$/);
  });

  it("stores nothing when storage cannot create the URL", async () => {
    const { owner } = await createTenant();
    mockedSign.mockRejectedValueOnce(new Error("storage down"));
    const res = await sign(owner, { purpose: "AVATAR", contentType: "image/png", size: 10 });
    expect(res.status).toBe(500);
    expect(await prisma.upload.count()).toBe(0);
  });

  it("limits how many URLs one user can request", async () => {
    process.env.RATE_LIMIT_ENABLED = "true";
    try {
      const { owner } = await createTenant();
      for (let i = 0; i < 60; i++) expect((await sign(owner, { purpose: "AVATAR", contentType: "image/png", size: 10 })).status).toBe(201);
      expect((await sign(owner, { purpose: "AVATAR", contentType: "image/png", size: 10 })).status).toBe(429);
    } finally {
      delete process.env.RATE_LIMIT_ENABLED;
    }
  });
});

describe("confirming an upload", () => {
  it("accepts a real image, records it and applies it as the user's avatar", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "AVATAR", "image/png");
    mockedRead.mockResolvedValue(PNG);

    const res = await confirm(owner, uploadId);

    expect(res.status).toBe(200);
    const row = await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } });
    expect(row).toMatchObject({ status: "CONFIRMED", detectedType: "png", sizeBytes: PNG.length });
    expect(res.body.url).toBe(`https://cdn.example.test/avatars/${row.path}`);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).avatarUrl).toBe(res.body.url);
  });

  it("applies an organization logo and returns a product image URL without touching the product", async () => {
    const { org, owner } = await createTenant();
    const logo = await signedUpload(owner, "ORG_LOGO", "image/png");
    const image = await signedUpload(owner, "PRODUCT_IMAGE", "image/png");
    mockedRead.mockResolvedValue(PNG);

    const logoRes = await confirm(owner, logo.uploadId);
    const imageRes = await confirm(owner, image.uploadId);

    expect((await prisma.organization.findUniqueOrThrow({ where: { id: org.id } })).logoUrl).toBe(logoRes.body.url);
    expect(imageRes.body.url).toContain("/products/");
  });

  it("identifies a private download only by a reference, never a URL", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "DOWNLOADABLE", "application/pdf");
    mockedRead.mockResolvedValue(PDF);

    const res = await confirm(owner, uploadId);

    const row = await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ purpose: "DOWNLOADABLE", reference: `storage:${row.path}` });
    expect(res.body.url).toBeUndefined();
  });

  it("accepts a zip based container declared as epub", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "DOWNLOADABLE", "application/epub+zip");
    mockedRead.mockResolvedValue(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]));
    expect((await confirm(owner, uploadId)).status).toBe(200);
  });

  it("refuses when nothing was uploaded and leaves the upload pending", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "AVATAR", "image/png");
    const res = await confirm(owner, uploadId);
    expect(res.status).toBe(400);
    expect((await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } })).status).toBe("PENDING");
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it("rejects content that is not what it claims to be, and deletes it from storage", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "AVATAR", "image/png");
    mockedRead.mockResolvedValue(HTML);

    const res = await confirm(owner, uploadId);

    expect(res.status).toBe(400);
    const row = await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } });
    expect(row.status).toBe("REJECTED");
    expect(mockedRemove).toHaveBeenCalledWith("avatars", row.path);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).avatarUrl).toBeNull();
    expect((await confirm(owner, uploadId)).status).toBe(400);
  });

  it.each([
    ["PNG bytes declared as JPEG", "AVATAR", "image/jpeg", PNG],
    ["a PDF declared as an image", "PRODUCT_IMAGE", "image/png", PDF],
    ["an image declared as a PDF", "DOWNLOADABLE", "application/pdf", PNG],
    ["an HTML page declared as a PDF", "DOWNLOADABLE", "application/pdf", HTML],
  ] as [string, UploadPurpose, string, Buffer][])("rejects %s", async (_label, purpose, declared, content) => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, purpose, declared);
    mockedRead.mockResolvedValue(content);
    expect((await confirm(owner, uploadId)).status).toBe(400);
    expect((await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } })).status).toBe("REJECTED");
    expect(mockedRemove).toHaveBeenCalledTimes(1);
  });

  it("rejects a file larger than it was signed for even when the type is right", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "AVATAR", "image/png", 100);
    mockedRead.mockResolvedValue(Buffer.concat([PNG, Buffer.alloc(5 * MB)]));
    expect((await confirm(owner, uploadId)).status).toBe(400);
    expect(mockedRemove).toHaveBeenCalledTimes(1);
  });

  it("belongs to the user who signed it", async () => {
    const { owner, manager } = await createTenant();
    const { uploadId } = await signedUpload(owner, "AVATAR", "image/png");
    mockedRead.mockResolvedValue(PNG);
    expect((await confirm(manager, uploadId)).status).toBe(404);
    const stranger = await createTenant();
    expect((await confirm(stranger.owner, uploadId)).status).toBe(404);
    expect((await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } })).status).toBe("PENDING");
  });

  it("refuses an upload whose signed URL has expired", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "AVATAR", "image/png");
    await prisma.upload.update({ where: { id: uploadId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    mockedRead.mockResolvedValue(PNG);
    expect((await confirm(owner, uploadId)).status).toBe(400);
  });

  it("is idempotent: confirming twice, even at once, applies it once", async () => {
    const { owner } = await createTenant();
    const { uploadId } = await signedUpload(owner, "AVATAR", "image/png");
    mockedRead.mockResolvedValue(PNG);

    const [a, b] = await Promise.all([confirm(owner, uploadId), confirm(owner, uploadId)]);
    const again = await confirm(owner, uploadId);

    expect([a.status, b.status, again.status]).toEqual([200, 200, 200]);
    expect(a.body.url).toBe(b.body.url);
    expect(await prisma.upload.count({ where: { status: "CONFIRMED" } })).toBe(1);
  });

  it("never lets one organization confirm into another's folder", async () => {
    const mine = await createTenant();
    const other = await createOrganization();
    const { uploadId } = await signedUpload(mine.owner, "PRODUCT_IMAGE", "image/png");
    const row = await prisma.upload.findUniqueOrThrow({ where: { id: uploadId } });
    expect(row.path.startsWith(`${mine.org.id}/`)).toBe(true);
    expect(row.path.startsWith(`${other.id}/`)).toBe(false);
  });
});
