import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../utils/audit";
import PDFDocument from "pdfkit";
import { sendEmail } from "../config/email";
import { reportEmailTemplate } from "../emails/templates";

export const getOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true, storePublished: true } });

    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalOrders,
      monthOrders,
      totalProducts,
      totalCustomers,
    ] = await Promise.all([
      prisma.payment.aggregate({ where: { organizationId: orgId, status: "COMPLETED" }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { organizationId: orgId, status: "COMPLETED", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { organizationId: orgId, status: "COMPLETED", createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
      prisma.order.count({ where: { organizationId: orgId } }),
      prisma.order.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
      prisma.product.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.customer.count({ where: { organizationId: orgId } }),
    ]);

    const allInventory = await prisma.inventory.findMany({
      where: { product: { organizationId: orgId, isActive: true } },
      select: { quantity: true, lowStockAlert: true },
    });
    const lowStockCount = allInventory.filter((i) => i.quantity <= i.lowStockAlert).length;

    const monthRev = monthRevenue._sum.amount || 0;
    const lastMonthRev = lastMonthRevenue._sum.amount || 0;
    const revenueGrowth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    res.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      monthRevenue: monthRev,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      totalOrders,
      monthOrders,
      totalProducts,
      totalCustomers,
      lowStockCount,
      storePublished: org?.storePublished || false,
      orgSlug: org?.slug || "",
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch overview data." });
  }
};

export const getSalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { from, to } = req.query;

    const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to as string) : new Date();

    const orders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        orderItems: { include: { product: { select: { name: true, categoryId: true } } } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const totalItems = orders.reduce((sum: number, o: any) => sum + o.orderItems.reduce((s: number, i: any) => s + i.quantity, 0), 0);

    res.json({ orders, totalRevenue, totalItems, orderCount: orders.length });
  } catch {
    res.status(500).json({ error: "Failed to generate sales report." });
  }
};

export const getTopProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { limit = "10" } = req.query;

    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { organizationId: orgId, status: "COMPLETED" } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: parseInt(limit as string),
    });

    const productIds = topProducts.map((p: any) => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, categoryId: true, imageUrl: true },
    });

    const result = topProducts.map((tp: any) => ({
      ...tp,
      product: products.find((p: any) => p.id === tp.productId),
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch top products." });
  }
};

export const getRevenueChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { period = "30" } = req.query;
    const days = parseInt(period as string);

    const todayUTC = new Date();
    todayUTC.setUTCHours(23, 59, 59, 999);
    const startDate = new Date(todayUTC);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const [rawPayments, rawOrders] = await Promise.all([
      prisma.$queryRaw<{ date: string; revenue: number }[]>`
        SELECT
          DATE(p."createdAt") as date,
          COALESCE(SUM(p."amount"), 0) as revenue
        FROM payments p
        WHERE p."organizationId" = ${orgId}
          AND p."status" = 'COMPLETED'
          AND p."createdAt" >= ${startDate}
        GROUP BY DATE(p."createdAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<{ date: string; orders: bigint }[]>`
        SELECT
          DATE(o."createdAt") as date,
          COUNT(*) as orders
        FROM orders o
        WHERE o."organizationId" = ${orgId}
          AND o."createdAt" >= ${startDate}
        GROUP BY DATE(o."createdAt")
        ORDER BY date ASC
      `,
    ]);

    const dataMap = new Map<string, { revenue: number; orders: number }>();
    for (const d of rawPayments) {
      dataMap.set(String(d.date).substring(0, 10), { revenue: Number(d.revenue), orders: 0 });
    }
    for (const d of rawOrders) {
      const key = String(d.date).substring(0, 10);
      const existing = dataMap.get(key) || { revenue: 0, orders: 0 };
      dataMap.set(key, { ...existing, orders: Number(d.orders) });
    }

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(todayUTC);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().substring(0, 10);
      const entry = dataMap.get(key) || { revenue: 0, orders: 0 };
      result.push({ date: key, ...entry });
    }

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch revenue chart data." });
  }
};

export const getCustomerChart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { period = "30" } = req.query;
    const days = parseInt(period as string);

    const todayUTC = new Date();
    todayUTC.setUTCHours(23, 59, 59, 999);
    const startDate = new Date(todayUTC);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const raw = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE(c."createdAt") as date, COUNT(*) as count
      FROM customers c
      WHERE c."organizationId" = ${orgId}
        AND c."createdAt" >= ${startDate}
      GROUP BY DATE(c."createdAt")
      ORDER BY date ASC
    `;

    const dataMap = new Map<string, number>();
    for (const d of raw) {
      dataMap.set(String(d.date).substring(0, 10), Number(d.count));
    }

    let cumulative = 0;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(todayUTC);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().substring(0, 10);
      cumulative += (dataMap.get(key) || 0);
      result.push({ date: key, customers: cumulative });
    }

    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch customer chart data." });
  }
};

const REPORT_LABELS: Record<string, string> = {
  revenue: "Revenue Report", products: "Products Report", orders: "Orders Report",
  customers: "Customers Report", inventory: "Inventory Report", staff: "Staff Report",
  "audit-logs": "Audit Logs Report",
  newsletter: "Newsletter Subscribers Report", payments: "Payments Report",
};

const DATE_RANGE_TYPES = ["revenue", "orders", "payments", "audit-logs"];

async function buildReportData(type: string, orgId: string, from: Date, to: Date) {
  if (type === "revenue") {
    return prisma.order.findMany({ where: { organizationId: orgId, createdAt: { gte: from, lte: to } }, include: { customer: true, orderItems: { include: { product: true } } }, orderBy: { createdAt: "desc" } });
  } else if (type === "products") {
    return prisma.product.findMany({ where: { organizationId: orgId }, include: { inventory: true, productCategory: true }, orderBy: { name: "asc" } });
  } else if (type === "orders") {
    return prisma.order.findMany({ where: { organizationId: orgId, createdAt: { gte: from, lte: to } }, include: { customer: true }, orderBy: { createdAt: "desc" } });
  } else if (type === "customers") {
    return prisma.customer.findMany({ where: { organizationId: orgId }, include: { _count: { select: { orders: true } } }, orderBy: { name: "asc" } });
  } else if (type === "inventory") {
    return prisma.inventory.findMany({ where: { product: { organizationId: orgId } }, include: { product: true }, orderBy: { quantity: "asc" } });
  } else if (type === "staff") {
    return prisma.user.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } });
  } else if (type === "newsletter") {
    return prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  } else if (type === "payments") {
    return prisma.payment.findMany({ where: { organizationId: orgId, createdAt: { gte: from, lte: to } }, include: { order: { select: { id: true } } }, orderBy: { createdAt: "desc" } });
  } else if (type === "audit-logs") {
    return prisma.auditLog.findMany({ where: { organizationId: orgId, createdAt: { gte: from, lte: to } }, include: { user: { select: { name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" } });
  }
  return [];
}

function fmt(d: any): string { return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-"; }
function money(n: any): string { return Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function safe(v: any, fallback = "-"): string { return (v !== null && v !== undefined && v !== "") ? String(v) : fallback; }

function buildPDF(type: string, label: string, org: any, from: string, to: string, rows: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = doc.page.width;
    const CONTENT_W = PAGE_W - 80;

    // ── Header band (dark bar) ──────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 56).fillColor("#0a0a0a").fill();

    // Left: red square logo mark + brand name
    doc.rect(40, 14, 28, 28).fillColor("#DE1010").fill();
    doc.fontSize(16).fillColor("#ffffff").font("Helvetica-Bold").text("T", 40, 18, { width: 28, align: "center" });
    doc.fontSize(13).fillColor("#ffffff").font("Helvetica-Bold").text("TRAQIFY", 74, 20);
    doc.fontSize(7).fillColor("#6b7280").font("Helvetica").text("Enterprise Store Management System", 74, 34);

    // Right: org name + contact (email · phone on one line)
    const contactParts = [org?.email, org?.phone].filter(Boolean).join("  ·  ");
    doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold").text(safe(org?.name, "Unknown Organisation"), 0, 16, { width: PAGE_W - 44, align: "right" });
    if (contactParts) doc.fontSize(7.5).fillColor("#9ca3af").font("Helvetica").text(contactParts, 0, 28, { width: PAGE_W - 44, align: "right" });
    if (org?.address) doc.fontSize(7).fillColor("#6b7280").text(safe(org.address), 0, 38, { width: PAGE_W - 44, align: "right" });

    // ── Report name strip (below header) ──────────────────────────────────
    doc.rect(0, 56, PAGE_W, 28).fillColor("#f9fafb").fill();
    doc.rect(0, 56, 4, 28).fillColor("#DE1010").fill();
    doc.fontSize(12).fillColor("#0a0a0a").font("Helvetica-Bold").text(label, 16, 63);

    // Period / date info on the right of the name strip
    const usesDateRange = DATE_RANGE_TYPES.includes(type);
    const periodText = usesDateRange && from && to
      ? `Period: ${fmt(from)} to ${fmt(to)}`
      : `As of ${fmt(new Date())}`;
    doc.fontSize(8).fillColor("#6b7280").font("Helvetica").text(periodText, 0, 66, { width: PAGE_W - 16, align: "right" });

    // Separator
    let y = 92;
    doc.moveTo(40, y).lineTo(PAGE_W - 40, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 10;

    // Table helpers
    const ROW_H = 20;
    let rowIndex = 0;
    const addRow = (cols: string[], widths: number[], isHeader = false) => {
      if (isHeader) {
        doc.rect(40, y - 3, CONTENT_W, ROW_H).fillColor("#f3f4f6").fill();
      } else if (rowIndex % 2 === 0) {
        doc.rect(40, y - 3, CONTENT_W, ROW_H).fillColor("#fafafa").fill();
      }
      if (!isHeader) rowIndex++;
      let x = 40;
      cols.forEach((c, i) => {
        doc.fillColor(isHeader ? "#111827" : "#374151").fontSize(isHeader ? 8 : 8).font(isHeader ? "Helvetica-Bold" : "Helvetica")
          .text(String(c).slice(0, 60), x + 3, y, { width: widths[i] - 6, lineBreak: false });
        x += widths[i];
      });
      y += ROW_H;
      if (y > doc.page.height - 50) {
        doc.addPage();
        doc.rect(0, 0, PAGE_W, 20).fillColor("#0a0a0a").fill();
        doc.rect(0, 0, 4, 20).fillColor("#DE1010").fill();
        doc.fontSize(8).fillColor("#9ca3af").font("Helvetica").text(`${label} (continued)`, 10, 6);
        doc.fontSize(8).fillColor("#9ca3af").text(safe(org?.name), 0, 6, { width: PAGE_W - 10, align: "right" });
        y = 28;
      }
    };

    const totalW = CONTENT_W;
    if (type === "revenue") {
      const w = [Math.round(totalW*0.12), Math.round(totalW*0.22), Math.round(totalW*0.12), Math.round(totalW*0.12), Math.round(totalW*0.16), Math.round(totalW*0.14), Math.round(totalW*0.12)];
      addRow(["Order ID", "Customer", "Date", "Status", "Items", "Amount (NGN)", "Payment"], w, true);
      rows.forEach((r) => addRow([r.id.slice(-8).toUpperCase(), safe(r.customer?.name, "Walk-in"), fmt(r.createdAt), safe(r.status), String(r.orderItems?.length || 0), money(r.totalAmount), safe(r.paymentMethod, "Cash")], w));
    } else if (type === "orders") {
      const w = [Math.round(totalW*0.12), Math.round(totalW*0.25), Math.round(totalW*0.14), Math.round(totalW*0.14), Math.round(totalW*0.18), Math.round(totalW*0.17)];
      addRow(["Order ID", "Customer", "Date", "Status", "Amount (NGN)", "Payment"], w, true);
      rows.forEach((r) => addRow([r.id.slice(-8).toUpperCase(), safe(r.customer?.name, "Walk-in"), fmt(r.createdAt), safe(r.status), money(r.totalAmount), safe(r.paymentMethod, "Cash")], w));
    } else if (type === "products") {
      const w = [Math.round(totalW*0.28), Math.round(totalW*0.12), Math.round(totalW*0.18), Math.round(totalW*0.14), Math.round(totalW*0.12), Math.round(totalW*0.10), Math.round(totalW*0.06)];
      addRow(["Name", "SKU", "Category", "Price (NGN)", "Stock", "Status", "Active"], w, true);
      rows.forEach((r) => addRow([safe(r.name), safe(r.sku), safe(r.productCategory?.name, "Uncategorised"), money(r.price), String(r.inventory?.quantity ?? 0), safe(r.status, "draft"), r.isActive ? "Yes" : "No"], w));
    } else if (type === "customers") {
      const w = [Math.round(totalW*0.25), Math.round(totalW*0.28), Math.round(totalW*0.18), Math.round(totalW*0.15), Math.round(totalW*0.14)];
      addRow(["Name", "Email", "Phone", "Orders", "Joined"], w, true);
      rows.forEach((r) => addRow([safe(r.name), safe(r.email, "Not provided"), safe(r.phone, "Not provided"), String(r._count?.orders || 0), fmt(r.createdAt)], w));
    } else if (type === "inventory") {
      const w = [Math.round(totalW*0.32), Math.round(totalW*0.14), Math.round(totalW*0.14), Math.round(totalW*0.14), Math.round(totalW*0.14), Math.round(totalW*0.12)];
      addRow(["Product", "SKU", "Quantity", "Low Stock At", "Status", "Alert"], w, true);
      rows.forEach((r) => addRow([safe(r.product?.name), safe(r.product?.sku), String(r.quantity), String(r.lowStockAlert), r.quantity <= r.lowStockAlert ? "Low Stock" : "OK", r.quantity <= r.lowStockAlert ? "YES" : "No"], w));
    } else if (type === "staff") {
      const w = [Math.round(totalW*0.22), Math.round(totalW*0.28), Math.round(totalW*0.14), Math.round(totalW*0.14), Math.round(totalW*0.12), Math.round(totalW*0.10)];
      addRow(["Name", "Email", "Role", "Joined", "Last Login", "Active"], w, true);
      rows.forEach((r) => addRow([safe(r.name, "Pending"), safe(r.email), safe(r.role), fmt(r.createdAt), fmt(r.lastLoginAt), r.isActive ? "Yes" : "No"], w));
    } else if (type === "newsletter") {
      const w = [Math.round(totalW*0.30), Math.round(totalW*0.45), Math.round(totalW*0.25)];
      addRow(["Name", "Email", "Subscribed On"], w, true);
      rows.forEach((r) => addRow([safe(r.name, "Anonymous"), safe(r.email), fmt(r.createdAt)], w));
    } else if (type === "payments") {
      const w = [Math.round(totalW*0.12), Math.round(totalW*0.14), Math.round(totalW*0.16), Math.round(totalW*0.16), Math.round(totalW*0.16), Math.round(totalW*0.14), Math.round(totalW*0.12)];
      addRow(["Reference", "Method", "Amount (NGN)", "Status", "Order", "Notes", "Date"], w, true);
      rows.forEach((r) => addRow([safe(r.reference), safe(r.method), money(r.amount), safe(r.status), r.order ? r.order.id.slice(-8).toUpperCase() : "-", safe(r.notes), fmt(r.createdAt)], w));
    } else if (type === "audit-logs") {
      const w = [Math.round(totalW*0.12), Math.round(totalW*0.14), Math.round(totalW*0.20), Math.round(totalW*0.20), Math.round(totalW*0.20), Math.round(totalW*0.14)];
      addRow(["Action", "Entity", "Performed By", "Email", "Details", "Date"], w, true);
      rows.forEach((r) => addRow([safe(r.action), safe(r.entity), safe(r.user?.name, "System"), safe(r.user?.email), safe(r.details), fmt(r.createdAt)], w));
    }

    if (rows.length === 0) {
      doc.fontSize(11).fillColor("#9ca3af").font("Helvetica")
        .text("No data available for the selected date range.", 40, y + 12, { width: CONTENT_W, align: "center" });
    }

    // Footer
    doc.moveTo(40, doc.page.height - 36).lineTo(PAGE_W - 40, doc.page.height - 36).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    doc.fontSize(7).fillColor("#9ca3af").font("Helvetica").text(`Total records: ${rows.length}  ·  Generated ${new Date().toLocaleString("en-GB")}`, 40, doc.page.height - 26);
    doc.fontSize(7).fillColor("#9ca3af").text("Powered by Traqify", 0, doc.page.height - 26, { width: PAGE_W - 40, align: "right" });

    doc.end();
  });
}

export const downloadReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { from, to } = req.query as { from: string; to: string };
    const orgId = req.user!.organizationId!;
    const label = REPORT_LABELS[type];
    if (!label) { res.status(400).json({ error: "Invalid report type." }); return; }

    const today = new Date(); today.setHours(23, 59, 59, 999);
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : today;
    if (toDate > today) { res.status(400).json({ error: "End date cannot be in the future." }); return; }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const rows = await buildReportData(type, orgId, fromDate, toDate);
    const pdf = await buildPDF(type, label, org, from || "", to || "", rows as any[]);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${type}-report.pdf"` });
    createAuditLog(req.user!.id, orgId, "EXPORT", "Report", undefined, `Downloaded ${label}`, req).catch(() => {});
    res.send(pdf);
  } catch {
    res.status(500).json({ error: "Failed to generate PDF." });
  }
};

export const emailReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const { to, from, to_date } = req.body;
    const orgId = req.user!.organizationId!;
    const label = REPORT_LABELS[type];
    if (!label) { res.status(400).json({ error: "Invalid report type." }); return; }
    if (!to) { res.status(400).json({ error: "Recipient email is required." }); return; }

    const today = new Date(); today.setHours(23, 59, 59, 999);
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to_date ? new Date(to_date) : today;
    if (toDate > today) { res.status(400).json({ error: "End date cannot be in the future." }); return; }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const rows = await buildReportData(type, orgId, fromDate, toDate);
    const pdf = await buildPDF(type, label, org, from || "", to_date || "", rows as any[]);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const html = reportEmailTemplate(org?.name || "", label, from || fmt(fromDate), to_date || fmt(toDate), `${frontendUrl}/dashboard/${org?.slug || ""}/reports`);

    await sendEmail(to, `${label} - ${org?.name}`, html, [{ filename: `${type}-report.pdf`, content: pdf, contentType: "application/pdf" }]);
    createAuditLog(req.user!.id, orgId, "EXPORT", "Report", undefined, `Emailed ${label} to ${to}`, req).catch(() => {});
    res.json({ message: `Report sent to ${to}.` });
  } catch {
    res.status(500).json({ error: "Failed to send report email." });
  }
};
