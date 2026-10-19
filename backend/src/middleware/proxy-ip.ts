import crypto from "crypto";
import net from "net";
import { NextFunction, Request, Response } from "express";

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/**
 * The web app calls this API through its own server (a same-origin proxy), so every request arrives from the
 * proxy's address and per-IP limits would treat all visitors as one. The proxy therefore forwards the visitor's
 * address in X-Client-Ip together with a shared secret. The address is honoured only when the secret matches, so
 * nobody else can claim an address to dodge a limit or fill the audit log with a false one, and only when it is a
 * single valid IP. Express's req.ip is then the visitor, which is what rate limiting and audit logs read.
 */
export const forwardedClientIp = (req: Request, _res: Response, next: NextFunction): void => {
  const secret = process.env.PROXY_SHARED_SECRET;
  const givenSecret = req.get("x-proxy-secret");
  const clientIp = req.get("x-client-ip");

  if (secret && givenSecret && clientIp && safeEqual(givenSecret, secret) && net.isIP(clientIp) !== 0) {
    Object.defineProperty(req, "ip", { value: clientIp, configurable: true });
  }
  next();
};
