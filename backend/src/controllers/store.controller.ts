import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import prisma from "../config/database";
import { sendEmail } from "../config/email";
import { wishlistReminderTemplate, newOrderEmailTemplate, storeOrderConfirmationEmailTemplate } from "../emails/templates";
import { createAuditLog } from "../utils/audit";
import https from "https";

export const getStoreProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { search, category, sort, inStock } = req.query;

    const org = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, logoUrl: true, website: true, email: true, phone: true, address: true, description: true, storePublished: true },
    });

    if (!org) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    if (!org.storePublished) {
      res.status(403).json({ error: "This store is currently offline." });
      return;
    }

    const rawProducts = await prisma.product.findMany({
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
        _count: { select: { reviews: { where: { status: "APPROVED" } } } },
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
      orderBy:
        sort === "price_asc" ? { price: "asc" }
        : sort === "price_desc" ? { price: "desc" }
        : sort === "name" ? { name: "asc" }
        : sort === "oldest" ? { createdAt: "asc" }
        : { createdAt: "desc" },
    });

    const products = rawProducts.map((p: any) => {
      const { reviews: reviewArr, ...rest } = p;
      const averageRating = reviewArr.length > 0
        ? Math.round((reviewArr.reduce((s: number, r: any) => s + r.rating, 0) / reviewArr.length) * 10) / 10
        : null;
      return { ...rest, averageRating };
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
        data: { name, email, phone, address, organizationId: org.id, source: "PURCHASE" },
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

    prisma.payment.create({
      data: {
        amount: totalAmount,
        currency: "NGN",
        status: paystackReference && verifiedAmount !== null ? "COMPLETED" : "PENDING",
        method: paymentMethod || "TRANSFER",
        reference: paystackReference || null,
        organizationId: org.id,
        orderId: order.id,
      },
    }).catch(() => {});

    for (const item of orderItemsData) {
      await prisma.inventory.updateMany({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    createAuditLog(orgOwner.id, org.id, "CREATE", "Order", order.id, `Store order ${orderNumber} placed by ${name} (${email}) - NGN ${totalAmount.toLocaleString()}`, req).catch(() => {});

    // Notify org owner by email
    const emailItems = order.orderItems.map((i: { product: { name: string }; quantity: number; unitPrice: number; subtotal?: number }) => ({
      name: i.product.name,
      qty: i.quantity,
      subtotal: i.subtotal ?? i.unitPrice * i.quantity,
    }));
    sendEmail(
      orgOwner.email,
      `New store order received: ${org.name}`,
      newOrderEmailTemplate(org.name, order.id, name, totalAmount, emailItems, `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/${org.slug}/orders`)
    ).catch((e) => console.error("[Email] Store order notification failed:", e.message));

    const orgContact = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { email: true, phone: true, address: true, logoUrl: true },
    });

    sendEmail(
      email,
      `Order ${orderNumber} confirmed - ${org.name}`,
      storeOrderConfirmationEmailTemplate(
        name,
        orderNumber,
        org.name,
        totalAmount,
        emailItems,
        { email: orgContact?.email || null, phone: orgContact?.phone || null, address: orgContact?.address || null },
        orgContact?.logoUrl || null,
        paymentMethod || "Bank Transfer"
      )
    ).catch((emailErr) => console.error("Order confirmation email failed:", emailErr));

    res.status(201).json({
      id: order.id,
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
