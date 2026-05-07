import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middleware/auth.middleware";

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user!.organizationId!;
    const { entity, action, userId, from, to, page = "1", limit = "50" } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          organizationId: orgId,
          ...(entity && { entity: entity as string }),
          ...(action && { action: action as string }),
          ...(userId && { userId: userId as string }),
          ...(from && to && { createdAt: { gte: new Date(from as string), lte: new Date(to as string) } }),
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.auditLog.count({ where: { organizationId: orgId } }),
    ]);

    res.json({ logs, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch {
    res.status(500).json({ error: "Failed to fetch audit logs." });
  }
};
