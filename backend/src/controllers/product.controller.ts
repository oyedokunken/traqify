import { Response } from "express";
import prisma from "../config/database";
import { productSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateSlug } from "../utils/slug";

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { search, categoryId, isActive, status, productType, page, limit } = req.query;
    const take = parseInt((limit as string) || "50");
    const skip = (parseInt((page as string) || "1") - 1) * take;

    const where: any = {
      organizationId: orgId,
      ...(search && { name: { contains: search as string, mode: "insensitive" } }),
      ...(categoryId && { categoryId: categoryId as string }),
      ...(isActive !== undefined && isActive !== "" && { isActive: isActive === "true" }),
      ...(status && status !== "" && { status: status as string }),
      ...(productType && productType !== "" && { productType: productType as string }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { inventory: true, variants: true, productCategory: true, _count: { select: { orderItems: true, reviews: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);

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

    const { name, sku, description, price, comparePrice, categoryId, imageUrl, imageUrls, status, isActive, variants, initialStock, lowStockAlert } = parsed.data;

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

    const { variants, initialStock, lowStockAlert, ...rest } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: rest,
      include: { inventory: true, variants: true },
    });

    await createAuditLog(req.user!.id, orgId, "UPDATE", "Product", id, `Updated product: ${product.name}`, req);
    res.json(product);
  } catch {
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
