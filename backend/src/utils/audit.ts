import prisma from "../config/database";
import { Request } from "express";

export const createAuditLog = async (
  userId: string,
  organizationId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
  req?: Request
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        organizationId,
        action,
        entity,
        entityId,
        details,
        ipAddress: req?.ip || req?.socket?.remoteAddress,
        userAgent: req?.get("user-agent"),
      },
    });
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
};
