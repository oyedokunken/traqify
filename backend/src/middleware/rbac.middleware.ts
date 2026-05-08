import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { UserRole } from "@prisma/client";

type RoleHierarchy = {
  [key in UserRole]: number;
};

const roleHierarchy: RoleHierarchy = {
  OWNER: 4,
  MANAGER: 3,
  AUDITOR: 2,
  CASHIER: 1,
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const userRole = req.user.role as UserRole;
    const hasPermission = roles.some((role) => roleHierarchy[userRole] >= roleHierarchy[role]);

    if (!hasPermission) {
      res.status(403).json({
        error: "You do not have permission to perform this action.",
        required: roles,
        current: userRole,
      });
      return;
    }

    next();
  };
};

export const requireMinRole = (minRole: UserRole) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const userRole = req.user.role as UserRole;
    if (roleHierarchy[userRole] < roleHierarchy[minRole]) {
      res.status(403).json({
        error: "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
};

export const isOwnerOrManager = requireRole("OWNER", "MANAGER");
export const isOwnerOnly = requireRole("OWNER");
export const isAtLeastCashier = requireMinRole("CASHIER");
export const isAtLeastAuditor = requireMinRole("AUDITOR");
