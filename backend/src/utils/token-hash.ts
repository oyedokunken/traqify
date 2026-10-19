import crypto from "crypto";

/**
 * One way hash for secrets that are emailed to a person and later presented back: reset links, invitation links.
 * Only the hash is stored, so reading the table (or an API response that echoes a row) does not hand out a working link.
 */
export const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");
