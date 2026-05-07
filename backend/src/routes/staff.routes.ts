import { Router } from "express";
import {
  getStaff,
  inviteStaff,
  getInvites,
  updateStaffRole,
  toggleStaffAccess,
  removeStaff,
  resetStaffPassword,
  getInviteDetails,
} from "../controllers/staff.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager, isOwnerOnly } from "../middleware/rbac.middleware";

const router = Router();

router.get("/invite/:token", getInviteDetails);

router.use(authenticate, requireOrg);

router.get("/", getStaff);
router.get("/invites", isOwnerOrManager, getInvites);
router.post("/invite", isOwnerOrManager, inviteStaff);
router.patch("/:userId/role", isOwnerOnly, updateStaffRole);
router.patch("/:userId/access", isOwnerOrManager, toggleStaffAccess);
router.delete("/:userId", isOwnerOnly, removeStaff);
router.post("/:userId/reset-password", isOwnerOrManager, resetStaffPassword);

export default router;
