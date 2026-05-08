import { Request, Response } from "express";
import prisma from "../config/database";
import { sendEmail } from "../config/email";

export const getStoreProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { search, category, sort, inStock } = req.query;

    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logoUrl: true, website: true },
    });

    if (!org) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
        ...(search ? { name: { contains: String(search), mode: "insensitive" } } : {}),
        ...(category ? { productCategory: { slug: String(category) } } : {}),
        ...(inStock === "true" ? { inventory: { quantity: { gt: 0 } } } : {}),
      },
      include: {
        inventory: { select: { quantity: true, lowStockAlert: true } },
      },
      orderBy:
        sort === "price_asc" ? { price: "asc" }
        : sort === "price_desc" ? { price: "desc" }
        : sort === "name" ? { name: "asc" }
        : { createdAt: "desc" },
    });

    const cats = await prisma.productCategory.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    res.json({ org, products, categories: cats });
  } catch {
    res.status(500).json({ error: "Failed to load store." });
  }
};

export const storeCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { name, email, phone, address, items, paymentMethod, notes } = req.body;

    if (!name || !email || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Name, email, and at least one item are required." });
      return;
    }

    const org = await prisma.organization.findUnique({ where: { slug } });
    if (!org) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    let customer = await prisma.customer.findFirst({
      where: { email, organizationId: org.id },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name, email, phone, address, organizationId: org.id },
      });
    }

    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: org.id, isActive: true },
      include: { inventory: true },
    });

    if (products.length !== productIds.length) {
      res.status(400).json({ error: "One or more products are unavailable." });
      return;
    }

    let totalAmount = 0;
    const orderItemsData: any[] = [];

    for (const item of items) {
      const product = products.find((p: typeof products[0]) => p.id === item.productId);
      if (!product) continue;
      const qty = parseInt(item.quantity) || 1;
      if (product.inventory && product.inventory.quantity < qty) {
        res.status(400).json({ error: `Insufficient stock for "${product.name}".` });
        return;
      }
      const subtotal = product.price * qty;
      totalAmount += subtotal;
      orderItemsData.push({
        productId: product.id,
        quantity: qty,
        unitPrice: product.price,
        subtotal,
      });
    }

    const orderNumber = `STR-${Date.now().toString(36).toUpperCase()}`;

    const orgOwner = await prisma.user.findFirst({
      where: { organizationId: org.id, role: "OWNER" },
      select: { id: true },
    });
    if (!orgOwner) {
      res.status(500).json({ error: "Store configuration error." });
      return;
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        organizationId: org.id,
        customerId: customer.id,
        createdById: orgOwner.id,
        totalAmount,
        status: "PENDING",
        paymentMethod: paymentMethod || "TRANSFER",
        notes: notes || null,
        orderItems: { create: orderItemsData },
      },
      include: {
        orderItems: { include: { product: { select: { name: true } } } },
      },
    }) as any;

    for (const item of orderItemsData) {
      await prisma.inventory.updateMany({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    const itemsHtml = order.orderItems
      .map((i: { product: { name: string }; quantity: number; subtotal?: number; unitPrice: number }) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.product.name} × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₦${(i.subtotal || i.unitPrice * i.quantity).toLocaleString()}</td></tr>`)
      .join("");

    await sendEmail(
      email,
      `Your order ${orderNumber} from ${org.name}`,
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <div style="margin-bottom:24px"><span style="background:#DE1010;color:white;padding:6px 14px;border-radius:8px;font-size:16px;font-weight:700">Traqify</span></div>
        <h2 style="font-size:22px;font-weight:700;color:#0a0a0a;margin-bottom:4px">Order confirmed!</h2>
        <p style="color:#6b7280;font-size:14px;margin-bottom:24px">Hi ${name}, your order from <strong>${org.name}</strong> has been received.</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="font-size:12px;color:#9ca3af;margin-bottom:4px">ORDER NUMBER</p>
          <p style="font-size:18px;font-weight:700;color:#0a0a0a">${orderNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${itemsHtml}
          <tr><td style="padding:12px 0;font-weight:700">Total</td><td style="padding:12px 0;font-weight:700;text-align:right;color:#DE1010">₦${totalAmount.toLocaleString()}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">Payment method: <strong>${paymentMethod || "Transfer"}</strong>. We will contact you to arrange delivery.</p>
        ${notes ? `<p style="color:#6b7280;font-size:13px">Notes: ${notes}</p>` : ""}
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Powered by Traqify</p>
      </div>`
    );

    res.status(201).json({
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
    });
  } catch {
    res.status(500).json({ error: "Failed to process order." });
  }
};
