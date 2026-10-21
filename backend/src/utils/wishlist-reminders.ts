import prisma from "../config/database";
import { sendEmail } from "../config/email";
import { getLogger } from "../config/logger";
import { wishlistReminderTemplate } from "../emails/templates";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Each reminder is due once a wishlist is old enough. "Due" has no upper limit, so it does not matter how often the
// job runs: a run sends the latest reminder that is due and counts the earlier ones as done, never a pile of them.
const REMINDERS = [
  { field: "sent30min", afterMs: 30 * MINUTE, label: "30 minutes ago" },
  { field: "sent2hr", afterMs: 2 * HOUR, label: "a couple of hours ago" },
  { field: "sentDay1", afterMs: 24 * HOUR, label: "yesterday" },
  { field: "sentDay3", afterMs: 72 * HOUR, label: "3 days ago" },
] as const;

const RETENTION_MS = 4 * 24 * HOUR;
const BATCH = 500;

export async function sendWishlistReminders(now: Date = new Date()): Promise<{ sent: number; failed: number; deleted: number }> {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const counts = { sent: 0, failed: 0, deleted: 0 };

  counts.deleted = (await prisma.wishlist.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - RETENTION_MS) } } })).count;

  const wishlists = await prisma.wishlist.findMany({
    where: { email: { not: null }, sentDay3: false, createdAt: { lte: new Date(now.getTime() - REMINDERS[0].afterMs) } },
    include: { organization: { select: { name: true, logoUrl: true } } },
    take: BATCH,
  });

  for (const wl of wishlists) {
    const age = now.getTime() - wl.createdAt.getTime();
    let due = -1;
    REMINDERS.forEach((r, i) => {
      if (age >= r.afterMs) due = i;
    });
    if (due < 0 || wl[REMINDERS[due].field]) continue;

    // Everything up to and including the one being sent is now done.
    const done = Object.fromEntries(REMINDERS.slice(0, due + 1).map((r) => [r.field, true]));
    try {
      const products = await prisma.product.findMany({
        where: { id: { in: wl.productIds }, organizationId: wl.organizationId },
        select: { name: true },
      });
      if (products.length > 0) {
        const html = wishlistReminderTemplate(
          wl.organization.name,
          wl.organization.logoUrl,
          `${frontendUrl}/store/${wl.slug}`,
          products.map((p) => p.name),
          REMINDERS[due].label
        );
        await sendEmail(wl.email!, `Your wishlist at ${wl.organization.name} is waiting`, html);
        counts.sent++;
      }
      await prisma.wishlist.update({ where: { id: wl.id }, data: done });
    } catch (err) {
      // Left as it was, so the next run tries again.
      counts.failed++;
      getLogger().warn({ err, wishlistId: wl.id }, "wishlist reminder failed");
    }
  }
  return counts;
}
