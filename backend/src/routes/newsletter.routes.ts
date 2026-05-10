import { Router } from "express";
import { subscribe, getSubscribers, deleteSubscriber } from "../controllers/newsletter.controller";
import { authenticate } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.post("/subscribe", subscribe);
router.get("/subscribers", authenticate, isOwnerOrManager, getSubscribers);
router.delete("/:id", authenticate, isOwnerOrManager, deleteSubscriber);

export default router;
