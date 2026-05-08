import { Router, Request, Response } from "express";
import { createOrganization, getOrganization, updateOrganization, getPublicStore } from "../controllers/org.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager, isOwnerOnly } from "../middleware/rbac.middleware";
import { upload, getSupabasePath } from "../middleware/upload.middleware";
import { uploadFile } from "../config/supabase";
import prisma from "../config/database";

const router = Router();

router.post("/", authenticate, createOrganization);
router.get("/:slug", authenticate, requireOrg, getOrganization);
router.patch("/:slug", authenticate, requireOrg, isOwnerOnly, updateOrganization);
router.get("/:slug/store", getPublicStore);

router.post("/:slug/upload-logo", authenticate, requireOrg, isOwnerOnly, upload.single("logo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No image provided." }); return; }
    const { slug } = req.params;
    const filePath = getSupabasePath("avatars", req.file.originalname);
    const logoUrl = await uploadFile("avatars", filePath, req.file.buffer, req.file.mimetype);
    await prisma.organization.update({ where: { slug }, data: { logoUrl } });
    res.json({ url: logoUrl });
  } catch (err: any) { res.status(500).json({ error: err.message || "Failed to upload logo." }); }
});

export default router;
