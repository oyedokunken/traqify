import { Router } from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg);

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", isOwnerOrManager, createProduct);
router.patch("/:id", isOwnerOrManager, updateProduct);
router.delete("/:id", isOwnerOrManager, deleteProduct);

export default router;
