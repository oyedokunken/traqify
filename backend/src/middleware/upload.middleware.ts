import multer from "multer";
import path from "path";

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WebP images are allowed."));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function getSupabasePath(prefix: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase() || ".jpg";
  return `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}
