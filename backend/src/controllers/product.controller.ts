import { parsePagination } from "../utils/pagination";
import { isStorageReference, storagePathOf } from "../utils/downloads";
import { Response } from "express";
import prisma from "../config/database";
import { Prisma } from "@prisma/client";
import { productSchema, productUpdateSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateSlug } from "../utils/slug";

/** A "storage:" reference must point at a file this organization uploaded and the server accepted. */
async function ownsStoredFile(organizationId: string, reference: string): Promise<boolean> {
  const upload = await prisma.upload.findFirst({
    where: { path: storagePathOf(reference), organizationId, purpose: "DOWNLOADABLE", status: "CONFIRMED" },
    select: { id: true },
  });
  return upload !== null;
}

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { search, categoryId, isActive, status, productType } = req.query;
    const { skip, take } = parsePagination(req.query, 50);

    const where: any = {
      organizationId: orgId,
      ...(search && { name: { contains: search as string, mode: "insensitive" } }),
      ...(categoryId && { categoryId: categoryId as string }),
      ...(isActive !== undefined && isActive !== "" && { isActive: isActive === "true" }),
      ...(status && status !== "" && { status: status as string }),
      ...(productType && productType !== "" && { productType: productType as string }),
    };

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          inventory: true,
          variants: true,
          productCategory: true,
          _count: { select: { orderItems: true, reviews: true } },
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

    const products = rawProducts.map((p: any) => {
      const { reviews: reviewArr, ...rest } = p;
      const averageRating = reviewArr.length > 0
        ? Math.round((reviewArr.reduce((s: number, r: any) => s + r.rating, 0) / reviewArr.length) * 10) / 10
        : null;
      return { ...rest, averageRating };
    });

    res.json({ products, total });
  } catch {
    res.status(500).json({ error: "Failed to fetch products." });
  }
};

export const getProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const product = await prisma.product.findFirst({
      where: { id, organizationId: orgId },
      include: { inventory: true, variants: true },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    res.json(product);
  } catch {
    res.status(500).json({ error: "Failed to fetch product." });
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { name, sku, description, price, comparePrice, categoryId, imageUrl, imageUrls, status, isActive, variants, initialStock, lowStockAlert, productType, downloadUrl } = parsed.data;

    if (categoryId && !(await prisma.productCategory.findFirst({ where: { id: categoryId, organizationId: orgId }, select: { id: true } }))) {
      res.status(400).json({ error: "Category not found." });
      return;
    }
    if (downloadUrl && isStorageReference(downloadUrl) && !(await ownsStoredFile(orgId, downloadUrl))) {
      res.status(400).json({ error: "File not found. Upload it again." });
      return;
    }

    const existing = await prisma.product.findUnique({ where: { sku_organizationId: { sku, organizationId: orgId } } });
    if (existing) {
      res.status(409).json({ error: `A product with SKU "${sku}" already exists.` });
      return;
    }

    const baseSlug = generateSlug(name);
    let productSlug = baseSlug;
    let slugCount = 0;
    while (true) {
      const slugExists = await prisma.product.findUnique({ where: { slug_organizationId: { slug: productSlug, organizationId: orgId } } });
      if (!slugExists) break;
      slugCount++;
      productSlug = `${baseSlug}-${slugCount}`;
    }

    const product = await prisma.product.create({
      data: {
        name, sku, description, price, comparePrice,
        productType,
        downloadUrl: productType === "DOWNLOADABLE" ? downloadUrl ?? undefined : undefined,
        slug: productSlug,
        categoryId: categoryId || undefined,
        imageUrl: imageUrl || (imageUrls && imageUrls[0]) || undefined,
        imageUrls: imageUrls || [],
        status: status || "published",
        isActive: isActive ?? true,
        organizationId: orgId,
        inventory: { create: { quantity: initialStock ?? 0, lowStockAlert: lowStockAlert ?? 10 } },
        variants: variants ? { create: variants } : undefined,
      },
      include: { inventory: true, variants: true, productCategory: true },
    });

    await createAuditLog(req.user!.id, orgId, "CREATE", "Product", product.id, `Created product: ${name}`, req);
    res.status(201).json(product);
  } catch {
    res.status(500).json({ error: "Failed to create product." });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const existing = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    const parsed = productUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const data = parsed.data;

    if (data.categoryId && !(await prisma.productCategory.findFirst({ where: { id: data.categoryId, organizationId: orgId }, select: { id: true } }))) {
      res.status(400).json({ error: "Category not found." });
      return;
    }

    if (data.downloadUrl && isStorageReference(data.downloadUrl) && !(await ownsStoredFile(orgId, data.downloadUrl))) {
      res.status(400).json({ error: "File not found. Upload it again." });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { inventory: true, variants: true },
    });

    await createAuditLog(req.user!.id, orgId, "UPDATE", "Product", id, `Updated product: ${product.name}`, req);
    res.json(product);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "A product with this SKU already exists." });
      return;
    }
    res.status(500).json({ error: "Failed to update product." });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const product = await prisma.product.findFirst({ where: { id, organizationId: orgId } });
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    await prisma.product.delete({ where: { id } });
    await createAuditLog(req.user!.id, orgId, "DELETE", "Product", id, `Deleted product: ${product.name}`, req);
    res.json({ message: "Product deleted successfully." });
  } catch {
    res.status(500).json({ error: "Failed to delete product." });
  }
};
