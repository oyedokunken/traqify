import { Router } from "express";
import {
  register,
  checkEmail,
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
  updateProfile,
  acceptInvite,
  refreshToken,
  logout,
} from "../controllers/auth.controller";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware";
import { requireTrustedOrigin } from "../middleware/csrf.middleware";
import { forgotPasswordEmailLimiter, forgotPasswordIpLimiter, sendOtpEmailLimiter, sendOtpIpLimiter, verifyOtpEmailLimiter, verifyOtpIpLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/register", register);
router.post("/check-email", checkEmail);
router.post("/send-otp", sendOtpIpLimiter, sendOtpEmailLimiter, sendOTP);
router.post("/verify-email", verifyOtpIpLimiter, verifyOtpEmailLimiter, verifyEmail);
router.post("/login", login);
router.get("/google-redirect", googleRedirect);
router.get("/google-callback", googleCallback);
router.get("/oauth-exchange/:code", exchangeOAuthCode);
router.post("/forgot-password", forgotPasswordIpLimiter, forgotPasswordEmailLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh", requireTrustedOrigin, refreshToken);
router.post("/accept-invite", acceptInvite);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);
router.post("/logout", requireTrustedOrigin, optionalAuthenticate, logout);

export default router;
