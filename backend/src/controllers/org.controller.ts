import { Response } from "express";
import prisma from "../config/database";
import { createOrganizationSchema, updateOrgSchema } from "../utils/validators";
import { generateUniqueSlug } from "../utils/slug";
import { createAuditLog } from "../utils/audit";
import { sendEmail } from "../config/email";
import { welcomeEmailTemplate, storeStatusEmailTemplate } from "../emails/templates";
import { AuthRequest } from "../middleware/auth.middleware";
import { Request } from "express";

export const createOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = createOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    if (req.user?.organizationId) {
      res.status(409).json({ error: "You already belong to an organization." });
      return;
    }

    const { name, email, phone, address, industry, size, website } = parsed.data;
    const slug = await generateUniqueSlug(name);

    const org = await prisma.organization.create({
      data: { name, slug, email, phone, address, industry, size, website },
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { organizationId: org.id, role: "OWNER" },
    });

    await createAuditLog(req.user!.id, org.id, "CREATE", "Organization", org.id, `Created organization: ${name}`, req);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const dashboardUrl = `${frontendUrl}/dashboard/${slug}/overview`;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (user) {
      await sendEmail(user.email, `Welcome to Traqify, ${org.name}!`, welcomeEmailTemplate(user.name || "there", org.name, dashboardUrl));
    }

    res.status(201).json({ organization: org, slug });
  } catch {
    res.status(500).json({ error: "Failed to create organization." });
  }
};

export const getOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: {
        _count: { select: { users: true, products: true, orders: true, customers: true } },
      },
    });

    if (!org || org.id !== req.user?.organizationId) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }

    res.json(org);
  } catch {
    res.status(500).json({ error: "Failed to fetch organization." });
  }
};

export const updateOrganization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const parsed = updateOrgSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org || org.id !== req.user?.organizationId) {
      res.status(404).json({ error: "Organization not found." });
      return;
    }

    const wasPublished = org.storePublished;
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: parsed.data,
    });

    if (parsed.data.storePublished !== undefined && parsed.data.storePublished !== wasPublished) {
      const owner = await prisma.user.findFirst({ where: { organizationId: org.id, role: "OWNER" } });
      if (owner) {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const storeUrl = `${frontendUrl}/store/${org.slug}`;
        const dashboardUrl = `${frontendUrl}/dashboard/${org.slug}/store`;
        await sendEmail(owner.email, `Your store is now ${parsed.data.storePublished ? "live" : "offline"}`, storeStatusEmailTemplate(org.name, parsed.data.storePublished, storeUrl, dashboardUrl)).catch(() => {});
      }
    }

    const storeToggled = parsed.data.storePublished !== undefined && parsed.data.storePublished !== wasPublished;
    const details = storeToggled
      ? `Store ${parsed.data.storePublished ? "published (went live)" : "unpublished (taken offline)"}`
      : "Updated organization settings";
    await createAuditLog(req.user!.id, org.id, storeToggled ? "UPDATE" : "UPDATE", "Organization", org.id, details, req);
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update organization." });
  }
};

export const getPublicStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logoUrl: true, website: true, email: true, phone: true, address: true, storePublished: true },
    });

    if (!org) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    if (!org.storePublished) {
      res.status(403).json({ error: "This store is currently offline." });
      return;
    }

    const products = await prisma.product.findMany({
      where: { organizationId: org.id, isActive: true, status: "published" },
      include: {
        inventory: { select: { quantity: true } },
        variants: true,
        productCategory: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const categories = await prisma.productCategory.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    res.json({ org, products, categories });
  } catch {
    res.status(500).json({ error: "Failed to fetch store." });
  }
};
