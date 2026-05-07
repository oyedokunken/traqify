import { Router } from "express";
import {
  register,
  sendOTP,
  verifyEmail,
  login,
  googleAuth,
  googleRedirect,
  googleCallback,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  acceptInvite,
  refreshToken,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/send-otp", sendOTP);
router.post("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/google-redirect", googleRedirect);
router.get("/google-callback", googleCallback);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshToken);
router.post("/accept-invite", acceptInvite);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

export default router;
