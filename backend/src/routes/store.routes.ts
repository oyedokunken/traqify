import { Router } from "express";
import { getStoreProducts, storeCheckout } from "../controllers/store.controller";

const router = Router();

router.get("/:slug", getStoreProducts);
router.post("/:slug/checkout", storeCheckout);

export default router;
