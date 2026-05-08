import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import prisma from "../config/database";
import { sendEmail } from "../config/email";
import { wishlistReminderTemplate, newOrderEmailTemplate } from "../emails/templates";
import { createAuditLog } from "../utils/audit";
import https from "https";

export const getStoreProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { search, category, sort, inStock } = req.query;

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
      where: {
        organizationId: org.id,
        isActive: true,
        status: "published",
        ...(search ? { name: { contains: String(search), mode: "insensitive" } } : {}),
        ...(category ? { productCategory: { slug: String(category) } } : {}),
        ...(inStock === "true" ? { inventory: { quantity: { gt: 0 } } } : {}),
      },
      include: {
        inventory: { select: { quantity: true, lowStockAlert: true } },
        productCategory: { select: { id: true, name: true, slug: true } },
      },
      orderBy:
        sort === "price_asc" ? { price: "asc" }
        : sort === "price_desc" ? { price: "desc" }
        : sort === "name" ? { name: "asc" }
        : sort === "oldest" ? { createdAt: "asc" }
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
    const { name, email, phone, address, items, paymentMethod, notes, paystackReference } = req.body;

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

    // Verify Paystack payment if reference provided
    let verifiedAmount: number | null = null;
    if (paystackReference && paymentMethod === "PAYSTACK") {
      try {
        const paystackData: any = await new Promise((resolve, reject) => {
          const options = {
            hostname: "api.paystack.co",
            port: 443,
            path: `/transaction/verify/${paystackReference}`,
            method: "GET",
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
          };
          const req2 = https.request(options, (r) => {
            let data = "";
            r.on("data", (c) => { data += c; });
            r.on("end", () => resolve(JSON.parse(data)));
          });
          req2.on("error", reject);
          req2.end();
        });
        if (!paystackData.status || paystackData.data?.status !== "success") {
          res.status(402).json({ error: "Payment not verified. Please complete payment before placing order." });
          return;
        }
        verifiedAmount = paystackData.data.amount / 100;
      } catch {
        res.status(500).json({ error: "Payment verification failed. Please contact support." });
        return;
      }
    }

    const orderNumber = `STR-${Date.now().toString(36).toUpperCase()}`;

    const orgOwner = await prisma.user.findFirst({
      where: { organizationId: org.id, role: "OWNER" },
      select: { id: true, email: true },
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
        status: paystackReference && verifiedAmount !== null ? OrderStatus.APPROVED : OrderStatus.PENDING,
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

    createAuditLog(orgOwner.id, org.id, "CREATE", "Order", order.id, `Store order ${orderNumber} placed by ${name} (${email}) - NGN ${totalAmount.toLocaleString()}`, req).catch(() => {});

    // Notify org owner by email
    sendEmail(
      orgOwner.email,
      `New store order received: ${org.name}`,
      newOrderEmailTemplate(org.name, order.id, name, totalAmount, orderItemsData.length, `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/${org.slug}/orders`)
    ).catch((e) => console.error("[Email] Store order notification failed:", e.message));

    const itemsHtml = order.orderItems
      .map((i: { product: { name: string }; quantity: number; subtotal?: number; unitPrice: number }) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.product.name} × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₦${(i.subtotal || i.unitPrice * i.quantity).toLocaleString()}</td></tr>`)
      .join("");

    const orgFull = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { email: true, phone: true, address: true, website: true },
    });
    const contactLines = [
      orgFull?.email ? `Email: ${orgFull.email}` : null,
      orgFull?.phone ? `Phone: ${orgFull.phone}` : null,
      orgFull?.address ? `Address: ${orgFull.address}` : null,
      orgFull?.website ? `Website: ${orgFull.website}` : null,
    ].filter(Boolean).map((l) => `<p style="margin:2px 0;color:#6b7280;font-size:12px">${l}</p>`).join("");

    try { await sendEmail(
      email,
      `Order ${orderNumber} confirmed - ${org.name}`,
      `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #f0f0f0">
          ${org.logoUrl ? `<img src="${org.logoUrl}" alt="${org.name}" style="width:40px;height:40px;border-radius:8px;object-fit:cover">` : `<div style="width:40px;height:40px;background:#DE1010;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px">${org.name[0]}</div>`}
          <div>
            <p style="margin:0;font-weight:700;color:#0a0a0a;font-size:16px">${org.name}</p>
            ${contactLines}
          </div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
          <span style="font-size:24px">&#10003;</span>
          <div>
            <p style="margin:0;font-weight:700;color:#166534;font-size:15px">Order confirmed!</p>
            <p style="margin:4px 0 0;color:#166534;font-size:13px">Hi ${name}, we have received your order.</p>
          </div>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;text-transform:uppercase;letter-spacing:.5px">Order number</p>
          <p style="font-size:20px;font-weight:700;color:#0a0a0a;margin:0">${orderNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
          <tr style="border-bottom:2px solid #f0f0f0">
            <th style="text-align:left;padding:8px 0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Item</th>
            <th style="text-align:right;padding:8px 0;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Amount</th>
          </tr>
          ${itemsHtml}
          <tr><td style="padding:12px 0;font-weight:700;border-top:2px solid #f0f0f0">Total</td><td style="padding:12px 0;font-weight:700;text-align:right;color:#DE1010;border-top:2px solid #f0f0f0">&#8358;${totalAmount.toLocaleString()}</td></tr>
        </table>
        <div style="background:#fef9f0;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:16px">
          <p style="margin:0;font-size:13px;color:#92400e"><strong>Payment:</strong> ${paymentMethod || "Bank Transfer"}. Our team will reach out with payment details shortly.</p>
          ${notes ? `<p style="margin:8px 0 0;font-size:13px;color:#92400e"><strong>Your notes:</strong> ${notes}</p>` : ""}
        </div>
        <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0">
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0">Powered by <strong style="color:#DE1010">Traqify</strong></p>
      </div>`
    ); } catch (emailErr) { console.error("Order confirmation email failed:", emailErr); }

    res.status(201).json({
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
    });
  } catch {
    res.status(500).json({ error: "Failed to process order." });
  }
};

export const saveWishlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { sessionId, email, productIds } = req.body;
    if (!sessionId || !Array.isArray(productIds)) {
      res.status(400).json({ error: "sessionId and productIds required." });
      return;
    }
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, storePublished: true },
    });
    if (!org || !org.storePublished) { res.status(404).json({ error: "Store not found." }); return; }

    if (productIds.length === 0) {
      await prisma.wishlist.deleteMany({ where: { sessionId, organizationId: org.id } });
      res.json({ message: "Wishlist cleared." });
      return;
    }

    const wishlist = await prisma.wishlist.upsert({
      where: { sessionId_organizationId: { sessionId, organizationId: org.id } },
      create: { sessionId, email: email || null, productIds, slug, organizationId: org.id },
      update: { email: email || undefined, productIds, updatedAt: new Date() },
    });
    res.json({ id: wishlist.id });
  } catch {
    res.status(500).json({ error: "Failed to save wishlist." });
  }
};

export const processWishlistEmails = async (): Promise<void> => {
  const now = new Date();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const schedules = [
    { field: "sent30min" as const, label: "30 minutes ago", minMs: 30 * 60 * 1000, maxMs: 45 * 60 * 1000 },
    { field: "sent2hr"   as const, label: "a couple of hours ago", minMs: 2 * 3600 * 1000, maxMs: 3 * 3600 * 1000 },
    { field: "sentDay1"  as const, label: "yesterday", minMs: 24 * 3600 * 1000, maxMs: 26 * 3600 * 1000 },
    { field: "sentDay3"  as const, label: "3 days ago", minMs: 72 * 3600 * 1000, maxMs: 80 * 3600 * 1000 },
  ];

  for (const schedule of schedules) {
    const minDate = new Date(now.getTime() - schedule.maxMs);
    const maxDate = new Date(now.getTime() - schedule.minMs);

    const wishlists = await prisma.wishlist.findMany({
      where: {
        email: { not: null },
        [schedule.field]: false,
        createdAt: { gte: minDate, lte: maxDate },
      },
      include: { organization: { select: { name: true, logoUrl: true } } },
    });

    for (const wl of wishlists) {
      try {
        const products = await prisma.product.findMany({
          where: { id: { in: wl.productIds }, organizationId: wl.organizationId },
          select: { name: true },
        });
        if (products.length === 0) continue;
        const storeUrl = `${frontendUrl}/store/${wl.slug}`;
        const html = wishlistReminderTemplate(
          wl.organization.name, wl.organization.logoUrl,
          storeUrl, products.map((p) => p.name), schedule.label
        );
        await sendEmail(wl.email!, `Your wishlist at ${wl.organization.name} is waiting`, html);
        await prisma.wishlist.update({ where: { id: wl.id }, data: { [schedule.field]: true } });
      } catch (err) {
        console.error(`Wishlist email failed for ${wl.id}:`, err);
      }
    }
  }

  // Delete wishlists older than 4 days
  await prisma.wishlist.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - 4 * 24 * 3600 * 1000) } },
  });
};
