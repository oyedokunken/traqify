import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

/**
 * Lets only the scheduler through. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. With no secret configured
 * nothing gets in, and the comparison takes the same time whatever part of the value is wrong.
 */
export const requireCronSecret = (req: Request, res: Response, next: NextFunction): void => {
  const secret = process.env.CRON_SECRET;
  const supplied = req.headers.authorization ?? "";
  const expected = `Bearer ${secret}`;

  const a = crypto.createHash("sha256").update(supplied).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!secret || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
