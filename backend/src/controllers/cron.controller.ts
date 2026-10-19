import { getLogger } from "../config/logger";
import { respondWithError } from "../middleware/error.middleware";
import { Request, Response } from "express";
import prisma from "../config/database";

/**
 * GET /api/cron/ping
 *
 * Called once per day by Vercel Cron (vercel.json → crons).
 * Runs a minimal SELECT 1 to keep the Supabase free-tier database
 * from pausing due to inactivity (7-day window).
 *
 * Security: Vercel automatically injects
 *   Authorization: Bearer <CRON_SECRET>
 * Set CRON_SECRET in Vercel project → Settings → Environment Variables.
 */
export const pingDb = async (req: Request, res: Response): Promise<void> => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const ts = new Date().toISOString();
    getLogger().info("database ping ok");
    res.json({ status: "ok", pinged: ts });
  } catch (err) {
    respondWithError(res, err, "DB ping failed");
  }
};
