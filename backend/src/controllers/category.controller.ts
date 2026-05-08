import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../utils/audit";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const cats = await prisma.productCategory.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    res.json(cats);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories." });
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: "Category name is required." }); return; }

    const slug = slugify(name);
    const existing = await prisma.productCategory.findUnique({ where: { slug_organizationId: { slug, organizationId: orgId } } });
    if (existing) { res.status(409).json({ error: `Category "${name}" already exists.` }); return; }

    const cat = await prisma.productCategory.create({ data: { name, slug, description, organizationId: orgId } });
    await createAuditLog(req.user!.id, orgId, "CREATE", "ProductCategory", cat.id, `Created category: ${name}`, req);
    res.status(201).json(cat);
  } catch {
    res.status(500).json({ error: "Failed to create category." });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;
    const { name, description } = req.body;

    const cat = await prisma.productCategory.findFirst({ where: { id, organizationId: orgId } });
    if (!cat) { res.status(404).json({ error: "Category not found." }); return; }

    const updated = await prisma.productCategory.update({
      where: { id },
      data: { name, slug: name ? slugify(name) : undefined, description },
    });
    await createAuditLog(req.user!.id, orgId, "UPDATE", "ProductCategory", id, `Updated category: ${updated.name}`, req);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update category." });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const cat = await prisma.productCategory.findFirst({ where: { id, organizationId: orgId } });
    if (!cat) { res.status(404).json({ error: "Category not found." }); return; }

    await prisma.productCategory.delete({ where: { id } });
    await createAuditLog(req.user!.id, orgId, "DELETE", "ProductCategory", id, `Deleted category: ${cat.name}`, req);
    res.json({ message: "Category deleted." });
  } catch {
    res.status(500).json({ error: "Failed to delete category." });
  }
};
