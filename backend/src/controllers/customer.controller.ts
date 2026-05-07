import { Response } from "express";
import prisma from "../config/database";
import { customerSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { search } = req.query;

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: orgId,
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: "insensitive" } },
            { email: { contains: search as string, mode: "insensitive" } },
            { phone: { contains: search as string, mode: "insensitive" } },
          ],
        }),
      },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(customers);
  } catch {
    res.status(500).json({ error: "Failed to fetch customers." });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: orgId },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: "Customer not found." });
      return;
    }

    res.json(customer);
  } catch {
    res.status(500).json({ error: "Failed to fetch customer." });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const customer = await prisma.customer.create({
      data: { ...parsed.data, organizationId: orgId },
    });

    await createAuditLog(req.user!.id, orgId, "CREATE", "Customer", customer.id, `Created customer: ${parsed.data.name}`, req);
    res.status(201).json(customer);
  } catch {
    res.status(500).json({ error: "Failed to create customer." });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const existing = await prisma.customer.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) {
      res.status(404).json({ error: "Customer not found." });
      return;
    }

    const customer = await prisma.customer.update({ where: { id }, data: req.body });
    await createAuditLog(req.user!.id, orgId, "UPDATE", "Customer", id, `Updated customer: ${customer.name}`, req);
    res.json(customer);
  } catch {
    res.status(500).json({ error: "Failed to update customer." });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const customer = await prisma.customer.findFirst({ where: { id, organizationId: orgId } });
    if (!customer) {
      res.status(404).json({ error: "Customer not found." });
      return;
    }

    await prisma.customer.delete({ where: { id } });
    await createAuditLog(req.user!.id, orgId, "DELETE", "Customer", id, `Deleted customer: ${customer.name}`, req);
    res.json({ message: "Customer deleted successfully." });
  } catch {
    res.status(500).json({ error: "Failed to delete customer." });
  }
};
