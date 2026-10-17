import crypto from "crypto";

/**
 * Order numbers combine a timestamp with random bytes so two orders created in the
 * same millisecond cannot collide. The column is also unique in the database.
 */
export const generateOrderNumber = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
