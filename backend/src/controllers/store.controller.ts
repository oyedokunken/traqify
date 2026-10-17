import { Request, Response } from "express";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import prisma from "../config/database";
import { sendEmail } from "../config/email";
import { wishlistReminderTemplate, newOrderEmailTemplate, storeOrderConfirmationEmailTemplate } from "../emails/templates";
import { createAuditLog } from "../utils/audit";
import { AppError, respondWithError } from "../middleware/error.middleware";
import { storeInitializeSchema, storePaystackCompleteSchema, storeTransferCheckoutSchema } from "../utils/validators";
import { placeOrder } from "../utils/order-placement";
import { completeCheckout, initializeCheckout } from "../utils/paystack-checkout";
import { generateOrderNumber } from "../utils/order-number";

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

interface PlacedOrderView {
  id: string;
  orderNumber: string;
  totalAmount: number;
  orderItems: { quantity: number; unitPrice: number; subtotal: number | null; product: { name: string } }[];
}

/** Audit entry plus the owner and customer emails. Failures are logged, never thrown. */
async function notifyStoreOrder(args: {
  req: Request;
  org: { id: string; name: string; slug: string };
  owner: { id: string; email: string };
  order: PlacedOrderView;
  customer: { name: string; email: string };
  paymentLabel: string;
}): Promise<void> {
  const { req, org, owner, order, customer, paymentLabel } = args;
  const totalAmount = order.totalAmount;

  createAuditLog(owner.id, org.id, "CREATE", "Order", order.id, `Store order ${order.orderNumber} placed by ${customer.name} (${customer.email}) - NGN ${totalAmount.toLocaleString()}`, req).catch(() => {});

  const emailItems = order.orderItems.map((i) => ({
    name: i.product.name,
    qty: i.quantity,
    subtotal: i.subtotal ?? i.unitPrice * i.quantity,
  }));

  sendEmail(
    owner.email,
    `New store order received: ${org.name}`,
    newOrderEmailTemplate(org.name, order.id, customer.name, totalAmount, emailItems, `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/${org.slug}/orders`)
  ).catch((e) => console.error("[Email] Store order notification failed:", e.message));

  const orgContact = await prisma.organization.findUnique({
    where: { id: org.id },
    select: { email: true, phone: true, address: true, logoUrl: true },
  });

  sendEmail(
    customer.email,
    `Order ${order.orderNumber} confirmed - ${org.name}`,
    storeOrderConfirmationEmailTemplate(
      customer.name,
      order.orderNumber,
      org.name,
      totalAmount,
      emailItems,
      { email: orgContact?.email || null, phone: orgContact?.phone || null, address: orgContact?.address || null },
      orgContact?.logoUrl || null,
      paymentLabel
    )
  ).catch((emailErr) => console.error("Order confirmation email failed:", emailErr));
}

async function loadPublishedStore(slug: string) {
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, storePublished: true } });
  if (!org || !org.storePublished) throw new AppError("Store not found.", 404);
  const owner = await prisma.user.findFirst({ where: { organizationId: org.id, role: "OWNER" }, select: { id: true, email: true } });
  if (!owner) throw new AppError("Store configuration error.", 500);
  return { org, owner };
}

/**
 * POST /api/store/:slug/checkout/initialize
 * Prices the cart on the server and creates the Paystack transaction. The
 * response carries the reference and access code the browser needs to pay.
 */
export const storeInitializeCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = storeInitializeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { org } = await loadPublishedStore(req.params.slug);
    const { items, ...customer } = parsed.data;
    res.status(201).json(await initializeCheckout(org, customer, items));
  } catch (err) {
    respondWithError(res, err, "Failed to start checkout.");
  }
};

/**
 * POST /api/store/:slug/checkout
 * Bank transfer: places a pending order from the submitted cart.
 * Paystack: completes a checkout the server created, identified only by its reference.
 */
export const storeCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const method = req.body?.paymentMethod ?? "TRANSFER";

    if (method === "PAYSTACK") {
      const parsed = storePaystackCompleteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }
      const { org, owner } = await loadPublishedStore(slug);
      const outcome = await completeCheckout(org, parsed.data.reference, owner.id);

      if (outcome.kind === "existing") {
        const { id, orderNumber, totalAmount, status } = outcome.order;
        res.status(200).json({ id, orderNumber, totalAmount, status });
        return;
      }

      const { order, session } = outcome;
      await notifyStoreOrder({
        req, org, owner, order,
        customer: { name: session.customerName, email: session.customerEmail },
        paymentLabel: "Paystack",
      });
      res.status(201).json({ id: order.id, orderNumber: order.orderNumber, totalAmount: order.totalAmount, status: order.status });
      return;
    }

    const parsed = storeTransferCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { name, email, phone, address, notes, items } = parsed.data;
    const { org, owner } = await loadPublishedStore(slug);

    const { order } = await placeOrder({
      organizationId: org.id,
      createdById: owner.id,
      orderNumber: generateOrderNumber("STR"),
      lines: items,
      customer: { kind: "find-or-create", name, email, phone, address, source: "PURCHASE" },
      status: OrderStatus.PENDING,
      paymentMethod: "TRANSFER",
      notes,
      payment: { status: PaymentStatus.PENDING },
    });

    await notifyStoreOrder({ req, org, owner, order, customer: { name, email }, paymentLabel: "Bank Transfer" });
    res.status(201).json({ id: order.id, orderNumber: order.orderNumber, totalAmount: order.totalAmount, status: order.status });
  } catch (err) {
    respondWithError(res, err, "Failed to process order.");
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
