import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { createOrganization, getOrganization, updateOrganization, getPublicStore } from "../controllers/org.controller";
import { authenticate, requireOrg, AuthRequest } from "../middleware/auth.middleware";
import { isOwnerOnly } from "../middleware/rbac.middleware";
import { upload, getSupabasePath } from "../middleware/upload.middleware";
import { uploadFile } from "../config/supabase";
import prisma from "../config/database";

const router = Router();

router.post("/", authenticate, createOrganization);
router.get("/:slug", authenticate, requireOrg, getOrganization);
router.patch("/:slug", authenticate, requireOrg, isOwnerOnly, updateOrganization);
router.get("/:slug/store", getPublicStore);

router.post(
  "/:slug/upload-logo",
  authenticate, requireOrg, isOwnerOnly,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("logo")(req, res, (err: any) => {
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
      const { slug } = req.params;
      // The slug in the URL must be the caller's own organization; check before uploading anything.
      const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
      if (!org || org.id !== (req as AuthRequest).user?.organizationId) {
        res.status(404).json({ error: "Organization not found." });
        return;
      }
      const filePath = getSupabasePath("avatars", req.file.originalname);
      const logoUrl = await uploadFile("avatars", filePath, req.file.buffer, req.file.mimetype);
      await prisma.organization.update({ where: { id: org.id }, data: { logoUrl } });
      res.json({ url: logoUrl });
    } catch (err: any) {
      console.error("[upload-logo] Error:", err);
      res.status(500).json({ error: err?.message || "Failed to upload logo." });
    }
  }
);

export default router;
