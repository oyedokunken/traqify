import { Response } from "express";
import prisma from "../config/database";
import { inventoryUpdateSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";

export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;

    const inventory = await prisma.inventory.findMany({
      where: { product: { organizationId: orgId } },
      include: {
        product: {
          select: { id: true, name: true, sku: true, categoryId: true, imageUrl: true, isActive: true },
        },
      },
      orderBy: { product: { name: "asc" } },
    });

    res.json(inventory);
  } catch {
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
};

export const getLowStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;

    const lowStock = await prisma.inventory.findMany({
      where: {
        product: { organizationId: orgId, isActive: true },
        quantity: { lte: prisma.inventory.fields.lowStockAlert },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, categoryId: true } },
      },
    });

    const results = await prisma.$queryRaw`
      SELECT i.*, p.name, p.sku, p."categoryId", p.id as product_id
      FROM inventory i
      JOIN products p ON p.id = i."productId"
      WHERE p."organizationId" = ${orgId}
        AND p."isActive" = true
        AND i.quantity <= i."lowStockAlert"
    `;

    res.json(results);
  } catch {
    res.status(500).json({ error: "Failed to fetch low stock items." });
  }
};

export const updateStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const orgId = req.user!.organizationId!;

    const parsed = inventoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const product = await prisma.product.findFirst({ where: { id: productId, organizationId: orgId } });
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    const inventory = await prisma.inventory.upsert({
      where: { productId },
      update: parsed.data,
      create: { productId, ...parsed.data },
    });

    await createAuditLog(
      req.user!.id,
      orgId,
      "UPDATE",
      "Inventory",
      productId,
      `Updated stock for ${product.name}: quantity=${parsed.data.quantity}`,
      req
    );

    res.json(inventory);
  } catch {
    res.status(500).json({ error: "Failed to update stock." });
  }
};
