import crypto from "crypto";

/**
 * Order numbers combine a timestamp with random bytes so two orders created in the
 * same millisecond cannot collide. The column is also unique in the database, and placing an order retries on the
 * rare clash.
 */
export const generateOrderNumber = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
