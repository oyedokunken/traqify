import { Router } from "express";
import {
  register,
  sendOTP,
  verifyEmail,
  login,
  googleRedirect,
  googleCallback,
  exchangeOAuthCode,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
  markWelcomeSeen,
  updateProfile,
  acceptInvite,
  refreshToken,
  logout,
} from "../controllers/auth.controller";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware";
import { requireTrustedOrigin } from "../middleware/csrf.middleware";
import { authLimiter, forgotPasswordEmailLimiter, loginEmailLimiter, forgotPasswordIpLimiter, sendOtpEmailLimiter, sendOtpIpLimiter, verifyOtpEmailLimiter, verifyOtpIpLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/send-otp", sendOtpIpLimiter, sendOtpEmailLimiter, sendOTP);
router.post("/verify-email", verifyOtpIpLimiter, verifyOtpEmailLimiter, verifyEmail);
router.post("/login", authLimiter, loginEmailLimiter, login);
router.get("/google-redirect", googleRedirect);
router.get("/google-callback", authLimiter, googleCallback);
router.post("/oauth-exchange", authLimiter, exchangeOAuthCode);
router.post("/forgot-password", forgotPasswordIpLimiter, forgotPasswordEmailLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/refresh", requireTrustedOrigin, refreshToken);
router.post("/accept-invite", authLimiter, acceptInvite);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);
router.post("/welcome-seen", authenticate, markWelcomeSeen);
router.post("/change-password", authenticate, changePassword);
router.post("/logout", requireTrustedOrigin, optionalAuthenticate, logout);

export default router;
