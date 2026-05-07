import { Router } from "express";
import { getOrders, getOrder, createOrder, updateOrderStatus, deleteOrder } from "../controllers/order.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager, isAtLeastCashier } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg);

router.get("/", getOrders);
router.get("/:id", getOrder);
router.post("/", isAtLeastCashier, createOrder);
router.patch("/:id/status", isOwnerOrManager, updateOrderStatus);
router.delete("/:id", isOwnerOrManager, deleteOrder);

export default router;
