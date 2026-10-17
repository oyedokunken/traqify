import crypto from "crypto";
import jwt from "jsonwebtoken";

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  tokenVersion?: number;
}

export const signToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
};

export const signRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "30d",
  } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
};

const EMAIL_PROOF_PURPOSE = "email-verification";

// Derived from JWT_SECRET so a proof can never be mistaken for an access or refresh token.
const emailProofSecret = (): string =>
  crypto.createHmac("sha256", process.env.JWT_SECRET!).update(EMAIL_PROOF_PURPOSE).digest("hex");

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Issued once an OTP for an address has been verified; registration requires it. */
export const signEmailVerificationToken = (email: string): string =>
  jwt.sign({ email: normalizeEmail(email), purpose: EMAIL_PROOF_PURPOSE }, emailProofSecret(), {
    algorithm: "HS256",
    expiresIn: "30m",
  });

export const verifyEmailVerificationToken = (token: string, email: string): boolean => {
  try {
    const payload = jwt.verify(token, emailProofSecret(), { algorithms: ["HS256"] }) as {
      email?: string;
      purpose?: string;
    };
    return payload.purpose === EMAIL_PROOF_PURPOSE && payload.email === normalizeEmail(email);
  } catch {
    return false;
  }
};
