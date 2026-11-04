import { NextFunction, Request, Response } from "express";
import { allowedOrigins, originOf } from "../config/origins";

/**
 * Protects endpoints that act on the refresh cookie. Browsers attach the cookie to any request the
 * API's own site could trigger, so the request must prove it came from the web app: the Origin (or
 * Referer) must be one of the allowed web app origins, and a custom header must be present. A custom header
 * forces a CORS preflight, which only the allowed origin passes, so a third party site cannot send it.
 */
export const requireTrustedOrigin = (req: Request, res: Response, next: NextFunction): void => {
  const origin = originOf(req.get("origin")) ?? originOf(req.get("referer"));

  if (!origin || !allowedOrigins().includes(origin) || req.get("x-requested-by") !== "traqify") {
    res.status(403).json({ error: "Forbidden." });
    return;
  }
  next();
};
