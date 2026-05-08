import { Router } from "express";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../controllers/category.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg);

router.get("/", getCategories);
router.post("/", isOwnerOrManager, createCategory);
router.patch("/:id", isOwnerOrManager, updateCategory);
router.delete("/:id", isOwnerOrManager, deleteCategory);

export default router;
