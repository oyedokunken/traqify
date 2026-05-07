import { Router } from "express";
import { getInventory, updateStock, getLowStock } from "../controllers/inventory.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg);

router.get("/", getInventory);
router.get("/low-stock", getLowStock);
router.patch("/:productId", isOwnerOrManager, updateStock);

export default router;
