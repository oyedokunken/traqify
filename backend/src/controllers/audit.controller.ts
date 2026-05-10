import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { entity, action, userId, from, to, isRead, page = "1", limit = "50" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      organizationId: orgId,
      ...(entity && entity !== "all" && { entity: entity as string }),
      ...(action && action !== "all" && { action: action as string }),
      ...(userId && { userId: userId as string }),
      ...(isRead !== undefined && isRead !== "" && { isRead: isRead === "true" }),
      ...(from && to && { createdAt: { gte: new Date(from as string), lte: new Date(to as string) } }),
    };

    const [logs, total, unreadCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { organizationId: orgId, isRead: false } }),
    ]);

    res.json({ logs, total, unreadCount, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch {
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const count = await prisma.auditLog.count({ where: { organizationId: orgId, isRead: false } });
    res.json({ count });
  } catch {
    res.status(500).json({ error: "Failed to fetch unread count." });
  }
};

export const markLogsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { ids, isRead, all } = req.body;

    if (all) {
      await prisma.auditLog.updateMany({
        where: { organizationId: orgId },
        data: { isRead: isRead !== false },
      });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await prisma.auditLog.updateMany({
        where: { organizationId: orgId, id: { in: ids } },
        data: { isRead: isRead !== false },
      });
    }

    const newUnread = await prisma.auditLog.count({ where: { organizationId: orgId, isRead: false } });
    res.json({ message: "Updated.", unreadCount: newUnread });
  } catch {
    res.status(500).json({ error: "Failed to update read status." });
  }
};
