import { OrderStatus } from "@prisma/client";
import { parsePagination } from "../utils/pagination";
import { Response } from "express";
import prisma from "../config/database";
import { orderSchema, orderStatusSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendEmail } from "../config/email";
import { orderApprovedEmailTemplate, orderCompletedEmailTemplate, newOrderEmailTemplate, storeOrderConfirmationEmailTemplate } from "../emails/templates";
import { placeOrder } from "../utils/order-placement";
import { generateOrderNumber } from "../utils/order-number";
import { buildDownloadLink } from "../utils/downloads";
import { AppError, respondWithError } from "../middleware/error.middleware";
import { canTransitionOrder } from "../utils/status-transitions";


export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { status, customerId } = req.query;
    const { page, limit, skip, take } = parsePagination(req.query, 20);

    if (status !== undefined && status !== "" && !orderStatusSchema.shape.status.safeParse(status).success) {
      res.status(400).json({ error: "Invalid order status." });
      return;
    }

    // The same filter drives the list and the total, so a cashier's count matches what they can see.
    const where = {
      organizationId: orgId,
      ...(req.user!.role === "CASHIER" && { createdById: req.user!.id }),
      ...(status && { status: status as OrderStatus }),
      ...(typeof customerId === "string" && customerId && { customerId }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          orderItems: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page, limit });
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

    const { order, customerCreated } = await placeOrder({
      organizationId: orgId,
      createdById: req.user!.id,
      orderNumber: generateOrderNumber("ORD"),
      lines: items,
      customer: rawCustomerId
        ? { kind: "existing", id: rawCustomerId }
        : newCustomer?.name
          ? { kind: "find-or-create", name: newCustomer.name, email: newCustomer.email || null, phone: newCustomer.phone, address: newCustomer.address, source: "MANUAL" }
          : null,
      status: "APPROVED",
      paymentMethod: paymentMethod || "TRANSFER",
      notes,
      payment: { status: "COMPLETED" },
    });

    if (customerCreated && order.customer) {
      await createAuditLog(req.user!.id, orgId, "CREATE", "Customer", order.customer.id, `Customer ${order.customer.name} added via manual order`, req);
    }

    await createAuditLog(req.user!.id, orgId, "CREATE", "Order", order.id, `Created order ${order.orderNumber}`, req);

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
  } catch (err) {
    respondWithError(res, err, "Failed to create order.");
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;
    const parsed = orderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { status } = parsed.data;

    const order = await prisma.order.findFirst({ where: { id, organizationId: orgId } });
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const include = {
      customer: true,
      orderItems: { include: { product: { select: { name: true, productType: true, downloadUrl: true } } } },
      organization: { select: { name: true, slug: true, logoUrl: true, email: true, phone: true, address: true } },
    } as const;

    if (order.status === status) {
      // Repeating the current status is a no-op: no emails and no stock movement.
      res.json(await prisma.order.findUniqueOrThrow({ where: { id }, include }));
      return;
    }
    if (!canTransitionOrder(order.status, status)) {
      res.status(409).json({ error: `An order that is ${order.status.toLowerCase()} cannot be changed to ${status.toLowerCase()}.` });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // The old status is part of the condition, so two concurrent requests cannot both apply a transition.
      const claimed = await tx.order.updateMany({ where: { id, organizationId: orgId, status: order.status }, data: { status } });
      if (claimed.count === 0) {
        throw new AppError("This order was changed by someone else. Refresh and try again.", 409);
      }
      if (status === "CANCELLED") {
        // Stock was taken when the order was placed, so cancelling puts it back.
        const items = await tx.orderItem.findMany({ where: { orderId: id }, select: { productId: true, quantity: true } });
        for (const item of items) {
          await tx.inventory.updateMany({ where: { productId: item.productId }, data: { quantity: { increment: item.quantity } } });
        }
        await tx.payment.updateMany({ where: { orderId: id, status: "PENDING" }, data: { status: "FAILED" } });
      }
      return tx.order.findUniqueOrThrow({ where: { id }, include });
    }) as any;

    await createAuditLog(req.user!.id, orgId, "UPDATE", "Order", id, `Updated order ${order.orderNumber} status to ${status}${status === "CANCELLED" ? " (stock restored)" : ""}`, req);

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
        // Buyers get signed links, never the file's address. Each click re-checks the order and mints a one minute URL.
        const downloadableItems = updated.orderItems
          .filter((i: any) => i.product?.productType === "DOWNLOADABLE" && i.product?.downloadUrl)
          .map((i: any) => ({ name: i.product.name, downloadUrl: buildDownloadLink(updated.organization.slug, updated.id, i.productId) }));

        sendEmail(
          updated.customer.email,
          `Order ${updated.orderNumber} delivered: ${updated.organization?.name}`,
          orderCompletedEmailTemplate(updated.customer.name, updated.orderNumber, updated.organization?.name || "", updated.totalAmount, updated.organization?.logoUrl || null, orgContact, updated.customer.email, downloadableItems)
        ).catch((e) => console.error("[Email] Order completed email failed:", e.message));
      }
    }

    res.json(updated);
  } catch (err) {
    respondWithError(res, err, "Failed to update order status.");
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

    const restock = order.status === "PENDING" || order.status === "APPROVED";

    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId: id }, select: { productId: true, quantity: true } });
      // Payments keep their row when the order goes away but lose the link, so they are updated first. If the
      // delete below finds the order changed, this whole transaction rolls back with it.
      if (restock) {
        await tx.payment.updateMany({ where: { orderId: id, status: "PENDING" }, data: { status: "FAILED" } });
      }
      // The status is part of the delete condition: if a concurrent request cancelled or completed the order
      // meanwhile, nothing is deleted and stock cannot be restored twice.
      const claimed = await tx.order.deleteMany({ where: { id, organizationId: orgId, status: order.status } });
      if (claimed.count === 0) {
        throw new AppError("This order was changed by someone else. Refresh and try again.", 409);
      }
      // Stock was taken when the order was placed. Only orders that were never delivered (pending or approved)
      // give it back; a completed order's goods have left, and a cancelled order was restocked when cancelled.
      if (restock) {
        for (const item of items) {
          await tx.inventory.updateMany({ where: { productId: item.productId }, data: { quantity: { increment: item.quantity } } });
        }
      }
    });

    await createAuditLog(req.user!.id, orgId, "DELETE", "Order", id, `Deleted order ${order.orderNumber}${restock ? " (stock restored)" : ""}`, req);
    res.json({ message: "Order deleted successfully." });
  } catch (err) {
    respondWithError(res, err, "Failed to delete order.");
  }
};
