import { Request, Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";
import { createAuditLog } from "../utils/audit";

export const submitReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, productId, rating, comment, customerName, customerEmail } = req.body;

    if (!orderId || !productId || !rating || !customerName) {
      res.status(400).json({ error: "orderId, productId, rating, and customerName are required." });
      return;
    }
    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5." });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: { where: { productId } } },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.status === "CANCELLED") {
      res.status(400).json({ error: "Reviews cannot be submitted for cancelled orders." });
      return;
    }
    if (!order.orderItems.length) {
      res.status(400).json({ error: "This product was not part of the specified order." });
      return;
    }

    const existing = await prisma.review.findUnique({ where: { orderId_productId: { orderId, productId } } });
    if (existing) {
      res.status(409).json({ error: "A review for this product and order has already been submitted." });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });

    const review = await prisma.review.create({
      data: {
        orderId,
        productId,
        organizationId: order.organizationId,
        rating: Number(rating),
        comment: comment || null,
        customerName,
        customerEmail: customerEmail || null,
        status: "PENDING",
      },
    });

    const orgOwner = await prisma.user.findFirst({ where: { organizationId: order.organizationId, role: "OWNER" } });
    if (orgOwner) {
      createAuditLog(orgOwner.id, order.organizationId, "CREATE", "Review", review.id, `New ${rating}-star review for "${product?.name || productId}" by ${customerName}`, req).catch(() => {});
    }

    res.status(201).json(review);
  } catch {
    res.status(500).json({ error: "Failed to submit review." });
  }
};

export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, rating: true, comment: true,
        customerName: true, createdAt: true,
      },
    });
    res.json(reviews);
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
};

export const getDashboardReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { status, page = "1", limit = "20" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ reviews, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("[getDashboardReviews]", err);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
};

export const moderateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const orgId = req.user!.organizationId!;

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
      return;
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review || review.organizationId !== orgId) {
      res.status(404).json({ error: "Review not found." });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: review.productId }, select: { name: true } });
    const updated = await prisma.review.update({
      where: { id },
      data: { status: action === "approve" ? "APPROVED" : "REJECTED" },
    });

    createAuditLog(req.user!.id, orgId, "UPDATE", "Review", id, `${action === "approve" ? "Approved" : "Rejected"} review for "${product?.name || review.productId}" by ${review.customerName}`, req).catch(() => {});

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to moderate review." });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId!;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review || review.organizationId !== orgId) {
      res.status(404).json({ error: "Review not found." });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: review.productId }, select: { name: true } });
    await prisma.review.delete({ where: { id } });
    createAuditLog(req.user!.id, orgId, "DELETE", "Review", id, `Deleted review for "${product?.name || review.productId}" by ${review.customerName}`, req).catch(() => {});
    res.json({ message: "Review deleted." });
  } catch {
    res.status(500).json({ error: "Failed to delete review." });
  }
};
