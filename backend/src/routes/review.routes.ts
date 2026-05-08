import { Router } from "express";
import { submitReview, getProductReviews, getDashboardReviews, moderateReview, deleteReview } from "../controllers/review.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.post("/", submitReview);
router.get("/product/:productId", getProductReviews);

router.use(authenticate, requireOrg);
router.get("/", isOwnerOrManager, getDashboardReviews);
router.patch("/:id/moderate", isOwnerOrManager, moderateReview);
router.delete("/:id", isOwnerOrManager, deleteReview);

export default router;
