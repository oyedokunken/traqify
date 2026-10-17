import { Request } from "express";
import rateLimit, { Store } from "express-rate-limit";

type StoreFactory = (prefix: string) => Store | undefined;

let storeFactory: StoreFactory = () => undefined;

/**
 * Swaps the counter store (for example a Redis adapter) so limits are shared
 * across serverless instances. Call it before the limiters below are created.
 * Without it, express-rate-limit's in-memory store is used and each instance
 * keeps its own counters.
 */
export const setRateLimitStoreFactory = (factory: StoreFactory): void => {
  storeFactory = factory;
};

interface LimiterOptions {
  prefix: string;
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = ({ prefix, windowMs, max, message, keyGenerator }: LimiterOptions) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    keyGenerator: keyGenerator ?? ((req) => `${prefix}:ip:${req.ip}`),
    store: storeFactory(prefix),
    // Tests opt in explicitly so unrelated suites are not throttled.
    skip: () => process.env.NODE_ENV === "test" && process.env.RATE_LIMIT_ENABLED !== "true",
  });

const ipKey = (prefix: string) => (req: Request) => `${prefix}:ip:${req.ip}`;

/** Keys by the email in the body (case-insensitive) so changing IP does not reset the budget. */
const emailKey = (prefix: string) => (req: Request) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return email ? `${prefix}:email:${email}` : `${prefix}:ip:${req.ip}`;
};

const HOUR = 60 * 60 * 1000;
const QUARTER_HOUR = 15 * 60 * 1000;

export const generalLimiter = createRateLimiter({
  prefix: "general",
  windowMs: QUARTER_HOUR,
  max: 200,
  message: "Too many requests, please try again later.",
});

export const authLimiter = createRateLimiter({
  prefix: "auth",
  windowMs: QUARTER_HOUR,
  max: 20,
  message: "Too many authentication attempts, please try again later.",
});

export const sendOtpIpLimiter = createRateLimiter({
  prefix: "otp-send",
  windowMs: HOUR,
  max: 10,
  message: "Too many verification codes requested. Please try again later.",
  keyGenerator: ipKey("otp-send"),
});

export const sendOtpEmailLimiter = createRateLimiter({
  prefix: "otp-send",
  windowMs: HOUR,
  max: 5,
  message: "Too many verification codes requested for this address. Please try again later.",
  keyGenerator: emailKey("otp-send"),
});

export const verifyOtpIpLimiter = createRateLimiter({
  prefix: "otp-verify",
  windowMs: QUARTER_HOUR,
  max: 15,
  message: "Too many verification attempts. Please try again later.",
  keyGenerator: ipKey("otp-verify"),
});

export const verifyOtpEmailLimiter = createRateLimiter({
  prefix: "otp-verify",
  windowMs: QUARTER_HOUR,
  max: 10,
  message: "Too many verification attempts for this address. Please try again later.",
  keyGenerator: emailKey("otp-verify"),
});
