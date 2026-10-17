import { Router } from "express";
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from "../controllers/customer.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { canWrite, isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg);

router.get("/", getCustomers);
router.get("/:id", getCustomer);
router.post("/", canWrite, createCustomer);
router.patch("/:id", canWrite, updateCustomer);
router.delete("/:id", isOwnerOrManager, deleteCustomer);

export default router;
