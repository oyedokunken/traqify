import { NextFunction, Request, Response } from "express";

const originOf = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Protects endpoints that act on the refresh cookie. Browsers attach the cookie to any request the
 * API's own site could trigger, so the request must prove it came from the web app: the Origin (or
 * Referer) must be the configured frontend, and a custom header must be present. A custom header
 * forces a CORS preflight, which only the allowed origin passes, so a third party site cannot send it.
 */
export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction): void => {
  const allowed = originOf(process.env.FRONTEND_URL);
  const origin = originOf(req.get("origin")) ?? originOf(req.get("referer"));

  if (!allowed || origin !== allowed || req.get("x-requested-by") !== "traqify") {
    res.status(403).json({ error: "Forbidden." });
    return;
  }
  next();
};
