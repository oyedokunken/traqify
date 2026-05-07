import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg, isOwnerOrManager);

router.get("/", getAuditLogs);

export default router;
