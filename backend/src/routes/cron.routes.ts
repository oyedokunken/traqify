import { Router } from "express";
import { pingDb } from "../controllers/cron.controller";

const router = Router();

// GET /api/cron/ping  – invoked daily by Vercel Cron
router.get("/ping", pingDb);

export default router;
