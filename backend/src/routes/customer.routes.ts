import { Router } from "express";
import { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } from "../controllers/customer.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg);

router.get("/", getCustomers);
router.get("/:id", getCustomer);
router.post("/", createCustomer);
router.patch("/:id", updateCustomer);
router.delete("/:id", isOwnerOrManager, deleteCustomer);

export default router;
