import { Router } from "express";
import { getStoreProducts, storeCheckout, saveWishlist } from "../controllers/store.controller";

const router = Router();

router.get("/:slug", getStoreProducts);
router.post("/:slug/checkout", storeCheckout);
router.post("/:slug/wishlist", saveWishlist);

export default router;
