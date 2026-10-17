import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "../utils/audit";
import { createPaymentSchema, updatePaymentSchema } from "../utils/validators";
import { canTransitionPayment } from "../utils/status-transitions";

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

const isReferenceConflict = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { amount, currency, status, method, reference, notes, orderId } = parsed.data;

    if (orderId && !(await prisma.order.findFirst({ where: { id: orderId, organizationId: orgId }, select: { id: true } }))) {
      res.status(400).json({ error: "Order not found." });
      return;
    }

    const payment = await prisma.payment.create({
      data: { amount, currency, status, method, reference, notes, organizationId: orgId, orderId: orderId ?? null },
      include: {
        order: { select: { id: true, orderNumber: true } },
      },
    });

    await createAuditLog(req.user!.id, orgId, "CREATE", "Payment", payment.id, `Recorded ${status.toLowerCase()} payment of NGN ${amount.toLocaleString()}`, req);
    res.status(201).json(payment);
  } catch (err) {
    if (isReferenceConflict(err)) {
      res.status(409).json({ error: "A payment with this reference already exists." });
      return;
    }
    res.status(500).json({ error: "Failed to create payment." });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { id } = req.params;
    const parsed = updatePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { status, method, reference, notes } = parsed.data;

    const existing = await prisma.payment.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) {
      res.status(404).json({ error: "Payment not found." });
      return;
    }

    if (status && status !== existing.status && !canTransitionPayment(existing.status, status)) {
      res.status(409).json({ error: `A ${existing.status.toLowerCase()} payment cannot be changed to ${status.toLowerCase()}.` });
      return;
    }
    if (reference !== undefined && existing.reference && reference !== existing.reference) {
      res.status(400).json({ error: "A payment reference cannot be changed once it is set." });
      return;
    }

    // The status is part of the condition so two concurrent updates cannot both apply a transition.
    const result = await prisma.payment.updateMany({
      where: { id, organizationId: orgId, status: existing.status },
      data: {
        ...(status && { status }),
        ...(method !== undefined && { method }),
        ...(reference !== undefined && { reference }),
        ...(notes !== undefined && { notes }),
      },
    });
    if (result.count === 0) {
      res.status(409).json({ error: "This payment was changed by someone else. Refresh and try again." });
      return;
    }

    const updated = await prisma.payment.findUniqueOrThrow({ where: { id } });
    if (status && status !== existing.status) {
      await createAuditLog(req.user!.id, orgId, "UPDATE", "Payment", id, `Payment status changed from ${existing.status} to ${status}`, req);
    }
    res.json(updated);
  } catch (err) {
    if (isReferenceConflict(err)) {
      res.status(409).json({ error: "A payment with this reference already exists." });
      return;
    }
    res.status(500).json({ error: "Failed to update payment." });
  }
};
