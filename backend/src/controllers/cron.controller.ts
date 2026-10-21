import { Request, Response } from "express";
import { getLogger } from "../config/logger";
import { respondWithError } from "../middleware/error.middleware";
import { expireInvites, purgeExpired, removeAbandonedUploads, settleAbandonedCheckouts } from "../utils/housekeeping";
import { sendWishlistReminders } from "../utils/wishlist-reminders";

/**
 * GET /api/cron/housekeeping, run daily by Vercel Cron (see vercel.json). It also keeps the free tier database from
 * pausing for inactivity. Each step is independent, so one failing does not stop the others. The response is counts
 * only, because the caller is a scheduler and the details belong in the logs.
 */
export const housekeeping = async (_req: Request, res: Response): Promise<void> => {
  try {
    const failed: string[] = [];
    const step = async <T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await run();
      } catch (err) {
        failed.push(name);
        getLogger().error({ err, step: name }, "housekeeping step failed");
        return fallback;
      }
    };

    const deleted = await step("purge", () => purgeExpired(), { otp: 0, resetTokens: 0, oauthSessions: 0, refreshTokens: 0 });
    const invitesExpired = await step("invites", () => expireInvites(), 0);
    const uploadsRemoved = await step("uploads", () => removeAbandonedUploads(), 0);
    const checkouts = await step("checkouts", () => settleAbandonedCheckouts(), { fulfilled: 0, refunded: 0, expired: 0, deferred: 0, needsReview: 0 });

    getLogger().info({ deleted, invitesExpired, uploadsRemoved, checkouts, failed }, "housekeeping finished");
    res.status(failed.length ? 500 : 200).json({ deleted, invitesExpired, uploadsRemoved, checkouts });
  } catch (err) {
    respondWithError(res, err, "Housekeeping failed.");
  }
};

/** GET /api/cron/wishlist-reminders, run daily by Vercel Cron. */
export const wishlistReminders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await sendWishlistReminders();
    getLogger().info(result, "wishlist reminders finished");
    res.json(result);
  } catch (err) {
    respondWithError(res, err, "Wishlist reminders failed.");
  }
};
