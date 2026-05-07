import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwt";
import prisma from "../config/database";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    organizationId: string | null;
    isActive: boolean;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload: JWTPayload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Your account has been deactivated. Please contact your administrator." });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};

export const requireOrg = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.organizationId) {
    res.status(403).json({ error: "You must belong to an organization to access this resource." });
    return;
  }
  next();
};
