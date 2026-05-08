import { Router, Request, Response } from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticate, requireOrg } from "../middleware/auth.middleware";
import { isOwnerOrManager } from "../middleware/rbac.middleware";
import { upload, getSupabasePath } from "../middleware/upload.middleware";
import { uploadFile } from "../config/supabase";

const router = Router();

router.use(authenticate, requireOrg);

router.post("/upload-image", isOwnerOrManager, upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No image provided." }); return; }
    const filePath = getSupabasePath("products", req.file.originalname);
    const url = await uploadFile("products", filePath, req.file.buffer, req.file.mimetype);
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Upload failed." });
  }
});

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", isOwnerOrManager, createProduct);
router.patch("/:id", isOwnerOrManager, updateProduct);
router.delete("/:id", isOwnerOrManager, deleteProduct);

export default router;
