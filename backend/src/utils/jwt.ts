import crypto from "crypto";
import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  tokenVersion?: number;
}

/** Access tokens are short lived; sessions are kept alive by the rotating refresh cookie. */
export const ACCESS_TOKEN_TTL = "15m";

// The algorithm is pinned on both sides so a token signed with "none" or any other algorithm is never accepted.
const ALGORITHM = "HS256" as const;

export const signToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { algorithm: ALGORITHM, expiresIn: ACCESS_TOKEN_TTL });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!, { algorithms: [ALGORITHM] }) as JWTPayload;
};

const EMAIL_PROOF_PURPOSE = "email-verification";

// Derived from JWT_SECRET so a proof can never be mistaken for an access token.
const emailProofSecret = (): string =>
  crypto.createHmac("sha256", process.env.JWT_SECRET!).update(EMAIL_PROOF_PURPOSE).digest("hex");

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Issued once an OTP for an address has been verified; registration requires it. */
export const signEmailVerificationToken = (email: string): string =>
  jwt.sign({ email: normalizeEmail(email), purpose: EMAIL_PROOF_PURPOSE }, emailProofSecret(), {
    algorithm: ALGORITHM,
    expiresIn: "30m",
  });

export const verifyEmailVerificationToken = (token: string, email: string): boolean => {
  try {
    const payload = jwt.verify(token, emailProofSecret(), { algorithms: [ALGORITHM] }) as {
      email?: string;
      purpose?: string;
    };
    return payload.purpose === EMAIL_PROOF_PURPOSE && payload.email === normalizeEmail(email);
  } catch {
    return false;
  }
};
