import { Router } from "express";
import { subscribe, getSubscribers } from "../controllers/newsletter.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.post("/subscribe", subscribe);
router.get("/subscribers", authenticate, isOwnerOrManager, getSubscribers);

export default router;
