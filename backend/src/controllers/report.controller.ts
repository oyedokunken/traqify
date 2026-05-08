import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";
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

    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalOrders,
      monthOrders,
      totalProducts,
      totalCustomers,
      lowStockCount,
    ] = await Promise.all([
      prisma.order.aggregate({ where: { organizationId: orgId, status: "COMPLETED" }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { organizationId: orgId, status: "COMPLETED", createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { organizationId: orgId, status: "COMPLETED", createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { organizationId: orgId } }),
      prisma.order.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
      prisma.product.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.customer.count({ where: { organizationId: orgId } }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM inventory i
        JOIN products p ON p.id = i."productId"
        WHERE p."organizationId" = ${orgId}
          AND p."isActive" = true
          AND i.quantity <= i."lowStockAlert"
      `,
    ]);

    const monthRev = monthRevenue._sum.totalAmount || 0;
    const lastMonthRev = lastMonthRevenue._sum.totalAmount || 0;
    const revenueGrowth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

    res.json({
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      monthRevenue: monthRev,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      totalOrders,
      monthOrders,
      totalProducts,
      totalCustomers,
      lowStockCount: Number(lowStockCount[0]?.count || 0),
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

    const productIds = topProducts.map((p) => p.productId);
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
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const data = await prisma.$queryRaw<{ date: string; revenue: number; orders: bigint }[]>`
      SELECT 
        DATE(o."createdAt") as date,
        SUM(o."totalAmount") as revenue,
        COUNT(*) as orders
      FROM orders o
      WHERE o."organizationId" = ${orgId}
        AND o.status = 'COMPLETED'
        AND o."createdAt" >= ${startDate}
      GROUP BY DATE(o."createdAt")
      ORDER BY date ASC
    `;

    res.json(data.map((d: any) => ({ ...d, orders: Number(d.orders) })));
  } catch {
    res.status(500).json({ error: "Failed to fetch revenue chart data." });
  }
};

const REPORT_LABELS: Record<string, string> = {
  revenue: "Revenue Report", products: "Products Report", orders: "Orders Report",
  customers: "Customers Report", inventory: "Inventory Report", staff: "Staff Report",
};

async function buildReportData(type: string, orgId: string, from: Date, to: Date) {
  if (type === "revenue") {
    return prisma.order.findMany({ where: { organizationId: orgId, createdAt: { gte: from, lte: to } }, include: { customer: true, orderItems: { include: { product: true } } }, orderBy: { createdAt: "desc" } });
  } else if (type === "products") {
    return prisma.product.findMany({ where: { organizationId: orgId }, include: { inventory: true }, orderBy: { name: "asc" } });
  } else if (type === "orders") {
    return prisma.order.findMany({ where: { organizationId: orgId, createdAt: { gte: from, lte: to } }, include: { customer: true }, orderBy: { createdAt: "desc" } });
  } else if (type === "customers") {
    return prisma.customer.findMany({ where: { organizationId: orgId }, include: { _count: { select: { orders: true } } }, orderBy: { name: "asc" } });
  } else if (type === "inventory") {
    return prisma.inventory.findMany({ where: { product: { organizationId: orgId } }, include: { product: true }, orderBy: { quantity: "asc" } });
  } else if (type === "staff") {
    return prisma.user.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } });
  }
  return [];
}

function buildPDF(type: string, label: string, orgName: string, from: string, to: string, rows: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(20).fillColor("#DE1010").text("Traqify", 50, 50).fillColor("#0a0a0a").fontSize(16).text(label, 50, 75);
    doc.fontSize(10).fillColor("#6b7280").text(`Organisation: ${orgName}`, 50, 100).text(`Period: ${from} to ${to}`, 50, 115).text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, 50, 130);
    doc.moveTo(50, 148).lineTo(545, 148).strokeColor("#e5e7eb").stroke();

    let y = 165;
    const addRow = (cols: string[], widths: number[], bold = false) => {
      const colors = bold ? "#f9fafb" : "#ffffff";
      doc.rect(50, y - 5, 495, 20).fillColor(colors).fill();
      let x = 50;
      cols.forEach((c, i) => {
        doc.fillColor(bold ? "#374151" : "#0a0a0a").fontSize(bold ? 9 : 9).text(String(c).slice(0, 40), x + 3, y, { width: widths[i] - 6 });
        x += widths[i];
      });
      y += 22;
      if (y > 760) { doc.addPage(); y = 60; }
    };

    if (type === "revenue" || type === "orders") {
      addRow(["Order ID", "Customer", "Date", "Status", "Amount (NGN)"], [80, 140, 90, 90, 95], true);
      rows.forEach((r) => addRow([r.id.slice(-8).toUpperCase(), r.customer?.name || "Guest", new Date(r.createdAt).toLocaleDateString("en-GB"), r.status, `${Number(r.totalAmount || 0).toLocaleString()}`], [80, 140, 90, 90, 95]));
    } else if (type === "products") {
      addRow(["Name", "SKU", "Price (NGN)", "Stock", "Status"], [160, 90, 95, 70, 80], true);
      rows.forEach((r) => addRow([r.name, r.sku, Number(r.price).toLocaleString(), String(r.inventory?.quantity ?? 0), r.isActive ? "Active" : "Inactive"], [160, 90, 95, 70, 80]));
    } else if (type === "customers") {
      addRow(["Name", "Email", "Phone", "Orders"], [150, 160, 110, 75], true);
      rows.forEach((r) => addRow([r.name, r.email || "", r.phone || "", String(r._count?.orders || 0)], [150, 160, 110, 75]));
    } else if (type === "inventory") {
      addRow(["Product", "SKU", "Quantity", "Low Stock At", "Alert"], [170, 90, 75, 90, 70], true);
      rows.forEach((r) => addRow([r.product?.name || "", r.product?.sku || "", String(r.quantity), String(r.lowStockAlert), r.quantity <= r.lowStockAlert ? "YES" : "No"], [170, 90, 75, 90, 70]));
    } else if (type === "staff") {
      addRow(["Name", "Email", "Role", "Joined", "Status"], [130, 160, 80, 80, 45], true);
      rows.forEach((r) => addRow([r.name || "Pending", r.email, r.role, new Date(r.createdAt).toLocaleDateString("en-GB"), r.isActive ? "Active" : "Off"], [130, 160, 80, 80, 45]));
    }

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

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();
    const rows = await buildReportData(type, orgId, fromDate, toDate);

    const pdf = await buildPDF(type, label, org?.name || "", from || "", to || "", rows as any[]);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${type}-report.pdf"` });
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

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to_date ? new Date(to_date) : new Date();
    const rows = await buildReportData(type, orgId, fromDate, toDate);

    const pdf = await buildPDF(type, label, org?.name || "", from || "", to_date || "", rows as any[]);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const html = reportEmailTemplate(org?.name || "", label, from || "", to_date || "", frontendUrl);

    await sendEmail(to, `${label} - ${org?.name}`, html, [{ filename: `${type}-report.pdf`, content: pdf, contentType: "application/pdf" }]);
    res.json({ message: `Report sent to ${to}.` });
  } catch {
    res.status(500).json({ error: "Failed to send report email." });
  }
};
