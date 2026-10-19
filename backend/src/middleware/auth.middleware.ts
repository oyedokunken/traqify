import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
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

type Resolution =
  | { ok: true; user: NonNullable<AuthRequest["user"]> }
  | { ok: false; status: 401 | 403; error: string };

/** Verifies a bearer token and loads the user it belongs to. */
async function resolveUser(authHeader: string | undefined): Promise<Resolution> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  try {
    const payload = verifyToken(authHeader.split(" ")[1]);

    const found = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!found) return { ok: false, status: 401, error: "User not found." };
    if (!found.isActive) {
      return { ok: false, status: 403, error: "Your account has been deactivated. Please contact your administrator." };
    }
    // Reject tokens issued before a password change or explicit logout
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== found.tokenVersion) {
      return { ok: false, status: 401, error: "Session expired. Please log in again." };
    }

    const { tokenVersion: _tokenVersion, ...user } = found;
    return { ok: true, user };
  } catch {
    return { ok: false, status: 401, error: "Invalid or expired token." };
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await resolveUser(req.headers.authorization);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  req.user = result.user;
  next();
};

/** Attaches the user when a valid access token is present and carries on either way. */
export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await resolveUser(req.headers.authorization);
  if (result.ok) req.user = result.user;
  next();
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
