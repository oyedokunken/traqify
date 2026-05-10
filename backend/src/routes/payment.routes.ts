import { Router } from "express";
import { getPayments, getPaymentById, createPayment, updatePayment } from "../controllers/payment.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isAtLeastAuditor, isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg);

router.get("/", isAtLeastAuditor, getPayments);
router.get("/:id", isAtLeastAuditor, getPaymentById);
router.post("/", isOwnerOrManager, createPayment);
router.patch("/:id", isOwnerOrManager, updatePayment);

export default router;
