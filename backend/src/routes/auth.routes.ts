import { Router, Request, Response } from "express";
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
import { authenticate, AuthRequest } from "../middleware/auth.middleware";
import { upload, getSupabasePath } from "../middleware/upload.middleware";
import { uploadFile } from "../config/supabase";
import prisma from "../config/database";

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
router.post("/upload-avatar", authenticate, upload.single("avatar"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No image provided." }); return; }
    const userId = (req as AuthRequest).user!.id;
    const filePath = getSupabasePath("avatars", req.file.originalname);
    const avatarUrl = await uploadFile("avatars", filePath, req.file.buffer, req.file.mimetype);
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    res.json({ url: avatarUrl });
  } catch (err: any) { res.status(500).json({ error: err.message || "Upload failed." }); }
});

export default router;
