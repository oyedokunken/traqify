import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import {
  register,
  checkEmail,
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
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { upload, getSupabasePath } from "../middleware/upload.middleware";
import { uploadFile } from "../config/supabase";
import prisma from "../config/database";

const router = Router();

router.post("/register", register);
router.post("/check-email", checkEmail);
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
router.post(
  "/upload-avatar",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("avatar")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: err.message }); return;
      }
      if (err) {
        res.status(400).json({ error: err.message || "Invalid file." }); return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) { res.status(400).json({ error: "No image provided." }); return; }
      const userId = (req as AuthRequest).user!.id;
      const filePath = getSupabasePath("avatars", req.file.originalname);
      const avatarUrl = await uploadFile("avatars", filePath, req.file.buffer, req.file.mimetype);
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
      res.json({ url: avatarUrl });
    } catch (err: any) {
      console.error("[upload-avatar] Error:", err);
      res.status(500).json({ error: err?.message || "Upload failed." });
    }
  }
);

export default router;
