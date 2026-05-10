import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";

export const getPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { status, search, from, to, page = "1", limit = "25" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      organizationId: orgId,
      ...(status && status !== "all" && { status }),
      ...(search && {
        OR: [
          { reference: { contains: search as string, mode: "insensitive" } },
          { notes: { contains: search as string, mode: "insensitive" } },
          { method: { contains: search as string, mode: "insensitive" } },
        ],
      }),
      ...(from && to && { createdAt: { gte: new Date(from as string), lte: new Date(to as string) } }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true, customer: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.payment.count({ where }),
    ]);

    const baseWhere = { organizationId: orgId };
    const [totalAmount, pendingAgg, completedAgg, failedAgg, refundedAgg] = await Promise.all([
      prisma.payment.aggregate({ where: baseWhere, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { ...baseWhere, status: "PENDING" }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { ...baseWhere, status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { ...baseWhere, status: "FAILED" }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { ...baseWhere, status: "REFUNDED" }, _sum: { amount: true }, _count: true }),
    ]);

    res.json({
      payments,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      stats: {
        total: { count: totalAmount._count, amount: totalAmount._sum.amount ?? 0 },
        pending: { count: pendingAgg._count, amount: pendingAgg._sum.amount ?? 0 },
        completed: { count: completedAgg._count, amount: completedAgg._sum.amount ?? 0 },
        failed: { count: failedAgg._count, amount: failedAgg._sum.amount ?? 0 },
        refunded: { count: refundedAgg._count, amount: refundedAgg._sum.amount ?? 0 },
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch payments." });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { id } = req.params;

    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: orgId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            customer: { select: { name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: "Payment not found." });
      return;
    }

    res.json(payment);
  } catch {
    res.status(500).json({ error: "Failed to fetch payment." });
  }
};

export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { amount, currency, status, method, reference, notes, orderId } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount is required and must be positive." });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        currency: currency || "NGN",
        status: status || "PENDING",
        method,
        reference,
        notes,
        organizationId: orgId,
        orderId: orderId || null,
      },
      include: {
        order: { select: { id: true, orderNumber: true } },
      },
    });

    res.status(201).json(payment);
  } catch {
    res.status(500).json({ error: "Failed to create payment." });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { id } = req.params;
    const { status, method, reference, notes } = req.body;

    const existing = await prisma.payment.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) {
      res.status(404).json({ error: "Payment not found." });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(method !== undefined && { method }),
        ...(reference !== undefined && { reference }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update payment." });
  }
};
