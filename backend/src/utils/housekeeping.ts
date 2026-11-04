import prisma from "../config/database";
import { getLogger } from "../config/logger";
import { removeStoredObject } from "../config/supabase";
import { AppError } from "../middleware/error.middleware";
import { completeCheckout } from "./paystack-checkout";
import { verifyPaystackTransaction } from "./paystack";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const BATCH = 50;

// A customer might still be on the Paystack page just after a checkout's own deadline, so give it an hour.
const CHECKOUT_GRACE_MS = HOUR;
// A transaction Paystack still lists as in progress is given a day before it is given up on.
const CHECKOUT_GIVE_UP_MS = DAY;
const ABANDONED_STATUSES = new Set(["abandoned", "failed", "reversed"]);

/** Removes one-time records that can no longer be used. Rows that are still live, or only just expired, stay. */
export async function purgeExpired(now: Date = new Date()) {
  const dayAgo = new Date(now.getTime() - DAY);
  const [otp, resetTokens, oauthSessions, refreshTokens] = await Promise.all([
    prisma.oTPVerification.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    prisma.oAuthSession.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return { otp: otp.count, resetTokens: resetTokens.count, oauthSessions: oauthSessions.count, refreshTokens: refreshTokens.count };
}

/** Pending invitations past their deadline are marked expired. They are kept, so the history stays. */
export async function expireInvites(now: Date = new Date()): Promise<number> {
  return (await prisma.staffInvite.updateMany({ where: { status: "PENDING", expiresAt: { lt: now } }, data: { status: "EXPIRED" } })).count;
}

/**
 * Uploads that were signed but never confirmed leave a stored file behind. The file goes first; the row is only
 * deleted once the file is gone, so a storage failure is retried on the next run instead of orphaning the file.
 */
export async function removeAbandonedUploads(now: Date = new Date()): Promise<number> {
  const stale = await prisma.upload.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date(now.getTime() - DAY) } },
    select: { id: true, bucket: true, path: true },
    take: 200,
  });
  let removed = 0;
  for (const upload of stale) {
    try {
      await removeStoredObject(upload.bucket, upload.path);
      await prisma.upload.delete({ where: { id: upload.id } });
      removed++;
    } catch (err) {
      getLogger().warn({ err, uploadId: upload.id }, "abandoned upload could not be removed");
    }
  }
  return removed;
}

export interface CheckoutCounts {
  fulfilled: number;
  refunded: number;
  expired: number;
  deferred: number;
  needsReview: number;
}

/**
 * Settles checkouts that were started and never completed by the customer. Paystack is always asked first: a customer
 * who paid and closed the tab gets their order, one who did not pay has the session expired, and an outage changes
 * nothing, so it is never mistaken for a failed payment.
 */
export async function settleAbandonedCheckouts(now: Date = new Date()): Promise<CheckoutCounts> {
  const counts: CheckoutCounts = { fulfilled: 0, refunded: 0, expired: 0, deferred: 0, needsReview: 0 };
  const sessions = await prisma.checkoutSession.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date(now.getTime() - CHECKOUT_GRACE_MS) } },
    include: { organization: { select: { id: true, slug: true, name: true } } },
    orderBy: { expiresAt: "asc" },
    take: BATCH,
  });

  for (const session of sessions) {
    try {
      const transaction = await verifyPaystackTransaction(session.reference);

      if (transaction?.status === "success") {
        if (transaction.currency !== session.currency || transaction.amountKobo !== session.amountKobo) {
          // Paid, but not what the cart came to. That is for a person to look at, not for automatic handling.
          getLogger().warn({ checkoutSessionId: session.id }, "paid checkout does not match its amount, needs review");
          counts.needsReview++;
          continue;
        }
        const owner = await prisma.user.findFirst({ where: { organizationId: session.organizationId, role: "OWNER" }, select: { id: true } });
        if (!owner) {
          counts.needsReview++;
          continue;
        }
        try {
          await completeCheckout(session.organization, session.reference, owner.id);
          counts.fulfilled++;
        } catch (err) {
          if (!(err instanceof AppError)) throw err;
          // completeCheckout refunds a paid checkout it cannot fulfil, then reports why.
          const after = await prisma.checkoutSession.findUniqueOrThrow({ where: { id: session.id }, select: { status: true } });
          if (after.status === "REFUNDED") counts.refunded++;
          else counts.needsReview++;
        }
        continue;
      }

      const overdue = now.getTime() - session.expiresAt.getTime() >= CHECKOUT_GIVE_UP_MS;
      if (transaction === null || ABANDONED_STATUSES.has(transaction.status) || overdue) {
        await prisma.checkoutSession.updateMany({
          where: { id: session.id, status: "PENDING" },
          data: { status: "EXPIRED", failureReason: "Payment was never completed." },
        });
        counts.expired++;
      } else {
        counts.deferred++;
      }
    } catch (err) {
      getLogger().warn({ err, checkoutSessionId: session.id }, "abandoned checkout could not be settled this run");
      counts.deferred++;
    }
  }
  return counts;
}
