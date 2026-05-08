import { Response } from "express";
import prisma from "../config/database";
import { orderSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendEmail } from "../config/email";
import { orderApprovedEmailTemplate, orderCompletedEmailTemplate } from "../emails/templates";

const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { status, customerId, page = "1", limit = "20" } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          organizationId: orgId,
          ...(req.user!.role === "CASHIER" && { createdById: req.user!.id }),
          ...(status && { status: status as any }),
          ...(customerId && { customerId: customerId as string }),
        },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          orderItems: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.order.count({ where: { organizationId: orgId } }),
    ]);

    res.json({ orders, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch {
    res.status(500).json({ error: "Failed to fetch orders." });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const order = await prisma.order.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true } },
        orderItems: {
          include: { product: { select: { id: true, name: true, sku: true, imageUrl: true } } },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    res.json(order);
  } catch {
    res.status(500).json({ error: "Failed to fetch order." });
  }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { items, customerId, notes, paymentMethod } = parsed.data;

    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((i) => i.productId) },
        organizationId: orgId,
        isActive: true,
      },
      include: { inventory: true },
    });

    if (products.length !== items.length) {
      res.status(400).json({ error: "One or more products were not found or are inactive." });
      return;
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (!product.inventory || product.inventory.quantity < item.quantity) {
        res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available: ${product.inventory?.quantity ?? 0}.`,
        });
        return;
      }
    }

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
      };
    });

    const totalAmount = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          organizationId: orgId,
          createdById: req.user!.id,
          customerId: customerId || undefined,
          notes,
          paymentMethod,
          totalAmount,
          status: "COMPLETED",
          orderItems: { create: orderItems },
        },
        include: {
          orderItems: { include: { product: true } },
          customer: true,
        },
      });

      for (const item of items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    await createAuditLog(req.user!.id, orgId, "CREATE", "Order", order.id, `Created order ${order.orderNumber}`, req);
    res.status(201).json(order);
  } catch {
    res.status(500).json({ error: "Failed to create order." });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;
    const { status } = req.body;

    if (!["PENDING", "APPROVED", "COMPLETED", "CANCELLED"].includes(status)) {
      res.status(400).json({ error: "Invalid order status." });
      return;
    }

    const order = await prisma.order.findFirst({ where: { id, organizationId: orgId } });
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        orderItems: { include: { product: { select: { name: true } } } },
        organization: { select: { name: true, logoUrl: true } },
      },
    }) as any;

    await createAuditLog(req.user!.id, orgId, "UPDATE", "Order", id, `Updated order ${order.orderNumber} status to ${status}`, req);

    if (updated.customer?.email) {
      const items = updated.orderItems.map((i: any) => ({
        name: i.product?.name || "Item",
        qty: i.quantity,
        subtotal: i.subtotal,
      }));
      if (status === "APPROVED") {
        sendEmail(
          updated.customer.email,
          `Order ${updated.orderNumber} approved — ${updated.organization?.name}`,
          orderApprovedEmailTemplate(updated.customer.name, updated.orderNumber, updated.organization?.name || "", updated.totalAmount, items, updated.organization?.logoUrl)
        ).catch((e) => console.error("[Email] Order approved email failed:", e.message));
      } else if (status === "COMPLETED") {
        sendEmail(
          updated.customer.email,
          `Order ${updated.orderNumber} delivered — ${updated.organization?.name}`,
          orderCompletedEmailTemplate(updated.customer.name, updated.orderNumber, updated.organization?.name || "", updated.totalAmount, updated.organization?.logoUrl)
        ).catch((e) => console.error("[Email] Order completed email failed:", e.message));
      }
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update order status." });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const order = await prisma.order.findFirst({ where: { id, organizationId: orgId } });
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    await prisma.order.delete({ where: { id } });
    await createAuditLog(req.user!.id, orgId, "DELETE", "Order", id, `Deleted order ${order.orderNumber}`, req);
    res.json({ message: "Order deleted successfully." });
  } catch {
    res.status(500).json({ error: "Failed to delete order." });
  }
};
