import { Response } from "express";
import prisma from "../config/database";
import { orderSchema } from "../utils/validators";
import { createAuditLog } from "../utils/audit";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendEmail } from "../config/email";
import { orderApprovedEmailTemplate, orderCompletedEmailTemplate, newOrderEmailTemplate, storeOrderConfirmationEmailTemplate } from "../emails/templates";
import https from "https";
import { placeOrder } from "../utils/order-placement";
import { generateOrderNumber } from "../utils/order-number";
import { respondWithError } from "../middleware/error.middleware";


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
        orderItems: { include: { product: { select: { name: true, productType: true, downloadUrl: true } } } },
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
        const downloadableItems = updated.orderItems
          .filter((i: any) => i.product?.productType === "DOWNLOADABLE" && i.product?.downloadUrl)
          .map((i: any) => ({ name: i.product.name, downloadUrl: i.product.downloadUrl }));

        const attachments: any[] = [];
        for (const item of downloadableItems) {
          let isAllowedHost = false;
          try {
            const parsed = new URL(item.downloadUrl);
            isAllowedHost = parsed.hostname.endsWith(".supabase.co") || parsed.hostname.endsWith(".supabase.in");
          } catch { /* malformed URL - skip */ }
          if (isAllowedHost) {
              try {
                const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
                  https.get(item.downloadUrl, (res: any) => {
                    const chunks: Buffer[] = [];
                    res.on("data", (chunk: Buffer) => chunks.push(chunk));
                    res.on("end", () => resolve(Buffer.concat(chunks)));
                    res.on("error", reject);
                  });
                });
                const filename = item.downloadUrl.split("/").pop() || "download.pdf";
                attachments.push({ filename, content: fileBuffer });
              } catch (err) {
                console.error("[Email] Failed to fetch downloadable file:", err);
              }
          }
        }

        sendEmail(
          updated.customer.email,
          `Order ${updated.orderNumber} delivered: ${updated.organization?.name}`,
          orderCompletedEmailTemplate(updated.customer.name, updated.orderNumber, updated.organization?.name || "", updated.totalAmount, updated.organization?.logoUrl || null, orgContact, updated.customer.email, downloadableItems),
          attachments.length > 0 ? attachments : undefined
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
