import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
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

router.post(
  "/upload-image",
  isOwnerOrManager,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err: any) => {
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
      const filePath = getSupabasePath("products", req.file.originalname);
      const url = await uploadFile("products", filePath, req.file.buffer, req.file.mimetype);
      res.json({ url });
    } catch (err: any) {
      console.error("[upload-image] Error:", err);
      res.status(500).json({ error: err?.message || "Upload failed." });
    }
  }
);

const DOWNLOADABLE_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "application/epub+zip",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
];

const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (DOWNLOADABLE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed for downloadable products.`));
    }
  },
});

router.post(
  "/upload-file",
  isOwnerOrManager,
  (req: Request, res: Response, next: NextFunction) => {
    uploadAny.single("file")(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: err.message }); return;
      }
      if (err) {
        res.status(400).json({ error: err.message || "Upload failed." }); return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      if (!req.file) { res.status(400).json({ error: "No file provided." }); return; }
      const filePath = getSupabasePath("downloadables", req.file.originalname);
      const url = await uploadFile("downloadables", filePath, req.file.buffer, req.file.mimetype);
      res.json({ url });
    } catch (err: any) {
      console.error("[upload-file] Error:", err);
      res.status(500).json({ error: err?.message || "Upload failed." });
    }
  }
);

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", isOwnerOrManager, createProduct);
router.patch("/:id", isOwnerOrManager, updateProduct);
router.delete("/:id", isOwnerOrManager, deleteProduct);

export default router;
