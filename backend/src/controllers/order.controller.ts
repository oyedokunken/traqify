import { Response } from "express";
import prisma from "../config/database";
import { orderSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendEmail } from "../config/email";
import { orderApprovedEmailTemplate, orderCompletedEmailTemplate, newOrderEmailTemplate, storeOrderConfirmationEmailTemplate } from "../emails/templates";

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
      prisma.order.count({ where: { organizationId: orgId, ...(status && { status: status as any }), ...(customerId && { customerId: customerId as string }) } }),
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

    const { items, customerId: rawCustomerId, newCustomer, notes, paymentMethod } = parsed.data;

    let resolvedCustomerId: string | undefined = rawCustomerId;

    if (!resolvedCustomerId && newCustomer?.name) {
      const email = newCustomer.email || null;
      let customer = email
        ? await prisma.customer.findFirst({ where: { email, organizationId: orgId } })
        : null;
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: newCustomer.name,
            email: email || undefined,
            phone: newCustomer.phone || undefined,
            address: newCustomer.address || undefined,
            organizationId: orgId,
            source: "MANUAL",
          },
        });
        await createAuditLog(req.user!.id, orgId, "CREATE", "Customer", customer.id, `Customer ${customer.name} added via manual order`, req);
      }
      resolvedCustomerId = customer.id;
    }

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
          customerId: resolvedCustomerId || undefined,
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

    // Auto-create a COMPLETED payment record for this dashboard order
    prisma.payment.create({
      data: {
        amount: totalAmount,
        currency: "NGN",
        status: "COMPLETED",
        method: paymentMethod || "TRANSFER",
        organizationId: orgId,
        orderId: order.id,
      },
    }).catch(() => {});

    // Notify org owner and customer
    const orgOwner = await prisma.user.findFirst({ where: { organizationId: orgId, role: "OWNER" } });
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, slug: true, email: true, phone: true, address: true, logoUrl: true } });
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const emailItems = order.orderItems.map((i: any) => ({
      name: i.product?.name || "Item",
      qty: i.quantity,
      subtotal: i.subtotal ?? i.unitPrice * i.quantity,
    }));
    if (orgOwner) {
      sendEmail(
        orgOwner.email,
        `New order received: ${org?.name}`,
        newOrderEmailTemplate(org?.name || "", order.id, order.customer?.name || "Walk-in", order.totalAmount, emailItems, `${frontendUrl}/dashboard/${org?.slug || ""}/orders`)
      ).catch((e) => console.error("[Email] New order notification failed:", e.message));
    }
    if (order.customer?.email) {
      sendEmail(
        order.customer.email,
        `Order ${order.orderNumber} confirmed - ${org?.name}`,
        storeOrderConfirmationEmailTemplate(
          order.customer.name || "Customer",
          order.orderNumber,
          org?.name || "",
          order.totalAmount,
          emailItems,
          { email: org?.email || null, phone: org?.phone || null, address: org?.address || null },
          org?.logoUrl || null,
          paymentMethod || "TRANSFER"
        )
      ).catch((e) => console.error("[Email] Customer order confirmation failed:", e.message));
    }

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
        organization: { select: { name: true, logoUrl: true, email: true, phone: true, address: true } },
      },
    }) as any;

    await createAuditLog(req.user!.id, orgId, "UPDATE", "Order", id, `Updated order ${order.orderNumber} status to ${status}`, req);

    if (updated.customer?.email) {
      const items = updated.orderItems.map((i: any) => ({
        name: i.product?.name || "Item",
        qty: i.quantity,
        subtotal: i.subtotal,
      }));
      const orgContact = {
        email: updated.organization?.email || null,
        phone: updated.organization?.phone || null,
        address: updated.organization?.address || null,
      };
      if (status === "APPROVED") {
        sendEmail(
          updated.customer.email,
          `Order ${updated.orderNumber} approved: ${updated.organization?.name}`,
          orderApprovedEmailTemplate(updated.customer.name, updated.orderNumber, updated.organization?.name || "", updated.totalAmount, items, updated.organization?.logoUrl || null, orgContact, updated.customer.email)
        ).catch((e) => console.error("[Email] Order approved email failed:", e.message));
      } else if (status === "COMPLETED") {
        sendEmail(
          updated.customer.email,
          `Order ${updated.orderNumber} delivered: ${updated.organization?.name}`,
          orderCompletedEmailTemplate(updated.customer.name, updated.orderNumber, updated.organization?.name || "", updated.totalAmount, updated.organization?.logoUrl || null, orgContact, updated.customer.email)
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
