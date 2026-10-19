import { Router } from "express";
import { confirmUpload, signUpload } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth.middleware";
import { uploadSignLimiter } from "../middleware/rate-limit";

const router = Router();

router.post("/sign", authenticate, uploadSignLimiter, signUpload);
router.post("/:id/confirm", authenticate, confirmUpload);

export default router;
