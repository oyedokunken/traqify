import { Request, Response } from "express";
import prisma from "../config/database";
import { createSignedDownloadUrl } from "../config/supabase";
import { AuthRequest } from "../middleware/auth.middleware";
import { respondWithError } from "../middleware/error.middleware";
import { DOWNLOAD_BUCKET, SIGNED_DOWNLOAD_SECONDS, isStorageReference, storagePathOf, verifyDownloadLink } from "../utils/downloads";

/** Turns a product's stored reference into a URL the browser can follow right now. */
async function resolveTarget(downloadUrl: string): Promise<string> {
  return isStorageReference(downloadUrl)
    ? createSignedDownloadUrl(DOWNLOAD_BUCKET, storagePathOf(downloadUrl), SIGNED_DOWNLOAD_SECONDS)
    : downloadUrl;
}

/**
 * GET /api/store/:slug/downloads/:orderId/:productId?exp=&sig=
 * The link in a delivery email only proves we issued it. Every use re-checks that the order belongs to this
 * store, contains the product, is completed and has not been fully refunded, then redirects to a URL that
 * works for one minute.
 */
export const downloadPurchasedFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug, orderId, productId } = req.params;
    if (!verifyDownloadLink(orderId, productId, req.query.exp, req.query.sig)) {
      res.status(403).json({ error: "This download link is invalid or has expired." });
      return;
    }

    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    const order = org
      ? await prisma.order.findFirst({
          where: { id: orderId, organizationId: org.id, orderItems: { some: { productId } } },
          select: { status: true, payments: { select: { status: true } } },
        })
      : null;
    if (!org || !order) {
      res.status(404).json({ error: "Download not found." });
      return;
    }

    const refundedOrFailed = order.payments.length > 0 && order.payments.every((p) => p.status === "FAILED" || p.status === "REFUNDED");
    if (order.status !== "COMPLETED" || refundedOrFailed) {
      res.status(403).json({ error: "This order is not eligible for download." });
      return;
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId: org.id, productType: "DOWNLOADABLE" },
      select: { downloadUrl: true },
    });
    if (!product?.downloadUrl) {
      res.status(404).json({ error: "Download not found." });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, await resolveTarget(product.downloadUrl));
  } catch (err) {
    respondWithError(res, err, "Could not prepare the download.");
  }
};

/** GET /api/products/:id/download-url: lets the owner or a manager open their own file. */
export const getProductDownloadUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId!, productType: "DOWNLOADABLE" },
      select: { downloadUrl: true },
    });
    if (!product?.downloadUrl) {
      res.status(404).json({ error: "This product has no downloadable file." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ url: await resolveTarget(product.downloadUrl), expiresInSeconds: isStorageReference(product.downloadUrl) ? SIGNED_DOWNLOAD_SECONDS : null });
  } catch (err) {
    respondWithError(res, err, "Could not prepare the download.");
  }
};
