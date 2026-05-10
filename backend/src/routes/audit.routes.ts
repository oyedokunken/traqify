import { Router } from "express";
import { getAuditLogs, getUnreadCount, markLogsRead } from "../controllers/audit.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isAtLeastAuditor, isOwnerOrManager } from "../middleware/rbac.middleware";

const router = Router();

router.use(authenticate, requireOrg, isAtLeastAuditor);

router.get("/", getAuditLogs);
router.get("/unread-count", getUnreadCount);
router.patch("/mark-read", isOwnerOrManager, markLogsRead);

export default router;
