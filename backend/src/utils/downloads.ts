import crypto from "crypto";

export const DOWNLOAD_BUCKET = "downloadables";
/** How long the URL handed to the browser works. Each click mints a fresh one. */
export const SIGNED_DOWNLOAD_SECONDS = 60;
/** How long a link in a delivery email keeps working. */
export const DOWNLOAD_LINK_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const STORAGE_PREFIX = "storage:";

// Derived from JWT_SECRET so a download signature can never be mistaken for any other token.
const secret = (): string => crypto.createHmac("sha256", process.env.JWT_SECRET!).update("download-link").digest("hex");

const sign = (orderId: string, productId: string, exp: number): string =>
  crypto.createHmac("sha256", secret()).update(`${orderId}.${productId}.${exp}`).digest("base64url");

/** Link a buyer receives by email. It only proves the link was issued by us; the order is re-checked on every use. */
export function buildDownloadLink(storeSlug: string, orderId: string, productId: string, now = Date.now()): string {
  const exp = now + DOWNLOAD_LINK_LIFETIME_MS;
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${base}/api/store/${encodeURIComponent(storeSlug)}/downloads/${encodeURIComponent(orderId)}/${encodeURIComponent(productId)}?exp=${exp}&sig=${sign(orderId, productId, exp)}`;
}

export function verifyDownloadLink(orderId: string, productId: string, exp: unknown, sig: unknown, now = Date.now()): boolean {
  if (typeof exp !== "string" || typeof sig !== "string" || !/^\d{10,16}$/.test(exp)) return false;
  if (Number(exp) < now) return false;
  const expected = Buffer.from(sign(orderId, productId, Number(exp)));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** A stored file is referenced as "storage:<path in the private bucket>"; anything else is an external link. */
export const isStorageReference = (value: string): boolean => value.startsWith(STORAGE_PREFIX);
export const storagePathOf = (reference: string): string => reference.slice(STORAGE_PREFIX.length);
