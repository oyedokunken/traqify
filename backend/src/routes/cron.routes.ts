import { Router } from "express";
import { housekeeping, wishlistReminders } from "../controllers/cron.controller";
import { requireCronSecret } from "../middleware/cron-auth";

const router = Router();

// Called by Vercel Cron (vercel.json), which sends the CRON_SECRET as a bearer token.
router.use(requireCronSecret);
router.get("/housekeeping", housekeeping);
router.get("/wishlist-reminders", wishlistReminders);

export default router;
