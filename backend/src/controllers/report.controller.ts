import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";

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
        orderItems: { include: { product: { select: { name: true, category: true } } } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalItems = orders.reduce((sum, o) => sum + o.orderItems.reduce((s, i) => s + i.quantity, 0), 0);

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
      select: { id: true, name: true, sku: true, category: true, imageUrl: true },
    });

    const result = topProducts.map((tp) => ({
      ...tp,
      product: products.find((p) => p.id === tp.productId),
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

    res.json(data.map((d) => ({ ...d, orders: Number(d.orders) })));
  } catch {
    res.status(500).json({ error: "Failed to fetch revenue chart data." });
  }
};
