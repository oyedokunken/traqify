import { Router } from "express";
import { getStoreProducts, storeCheckout, storeInitializeCheckout, saveWishlist } from "../controllers/store.controller";
import { downloadPurchasedFile } from "../controllers/download.controller";

const router = Router();

router.get("/:slug", getStoreProducts);
router.post("/:slug/checkout/initialize", storeInitializeCheckout);
router.post("/:slug/checkout", storeCheckout);
router.post("/:slug/wishlist", saveWishlist);
router.get("/:slug/downloads/:orderId/:productId", downloadPurchasedFile);

export default router;
