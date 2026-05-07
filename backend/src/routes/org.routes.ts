import { Router } from "express";
import { createOrganization, getOrganization, updateOrganization, getPublicStore } from "../controllers/org.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager, isOwnerOnly } from "../middleware/rbac.middleware";

const router = Router();

router.post("/", authenticate, createOrganization);
router.get("/:slug", authenticate, requireOrg, getOrganization);
router.patch("/:slug", authenticate, requireOrg, isOwnerOnly, updateOrganization);
router.get("/:slug/store", getPublicStore);

export default router;
