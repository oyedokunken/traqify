import { Response } from "express";
import prisma from "../config/database";
import { productSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";

export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { search, category, isActive } = req.query;

    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
        ...(search && { name: { contains: search as string, mode: "insensitive" } }),
        ...(category && { category: category as string }),
        ...(isActive !== undefined && { isActive: isActive === "true" }),
      },
      include: {
        inventory: true,
        variants: true,
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(products);
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

    const { name, sku, description, price, comparePrice, category, imageUrl, isActive, variants, initialStock, lowStockAlert } = parsed.data;

    const existing = await prisma.product.findUnique({ where: { sku_organizationId: { sku, organizationId: orgId } } });
    if (existing) {
      res.status(409).json({ error: `A product with SKU "${sku}" already exists.` });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description,
        price,
        comparePrice,
        category,
        imageUrl,
        isActive: isActive ?? true,
        organizationId: orgId,
        inventory: {
          create: { quantity: initialStock ?? 0, lowStockAlert: lowStockAlert ?? 10 },
        },
        variants: variants
          ? { create: variants }
          : undefined,
      },
      include: { inventory: true, variants: true },
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
