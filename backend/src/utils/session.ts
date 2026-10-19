import crypto from "crypto";
import { CookieOptions, Response } from "express";
import prisma from "../config/database";

export const REFRESH_COOKIE = "traqify_rt";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** A token reused this soon after its rotation is a concurrent request (two tabs), not theft. */
export const REUSE_GRACE_MS = 10_000;
/** Used tokens are kept for a day so reuse can be detected, then discarded. */
const USED_TOKEN_RETENTION_MS = 24 * 60 * 60 * 1000;

const hashToken = (raw: string): string => crypto.createHash("sha256").update(raw).digest("hex");

/**
 * The cookie is httpOnly (not readable by scripts), Secure in production and scoped to the auth routes. The web app
 * reaches the API through its own origin, so the cookie is first party and SameSite=Lax is enough. COOKIE_SAMESITE
 * can override it; "none" forces Secure.
 */
export function refreshCookieOptions(): CookieOptions {
  const production = process.env.NODE_ENV === "production";
  const configured = process.env.COOKIE_SAMESITE;
  const sameSite = configured === "strict" || configured === "none" ? configured : "lax";
  return { httpOnly: true, secure: production || sameSite === "none", sameSite, path: "/api/auth" };
}

function setRefreshCookie(res: Response, raw: string): void {
  res.cookie(REFRESH_COOKIE, raw, { ...refreshCookieOptions(), maxAge: REFRESH_TTL_MS });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}

async function mintRefreshToken(userId: string, tokenVersion: number, familyId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(raw), familyId, tokenVersion, userId, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  return raw;
}

/** Starts a new session for a user who just authenticated and sets the refresh cookie. */
export async function startSession(res: Response, user: { id: string; tokenVersion: number }): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
  setRefreshCookie(res, await mintRefreshToken(user.id, user.tokenVersion, crypto.randomUUID()));
}

export type RotationResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "reuse" | "in_progress" };

/**
 * Exchanges a refresh token for its successor. Each token works once. Presenting a token that was
 * already used (outside the concurrency grace window) means it was copied, so the user's
 * tokenVersion is bumped, which invalidates every access and refresh token they hold.
 */
export async function rotateSession(res: Response, raw: unknown): Promise<RotationResult> {
  if (typeof raw !== "string" || raw.length === 0) return { ok: false, reason: "invalid" };

  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: { select: { id: true, tokenVersion: true, isActive: true } } } });
  if (!record || record.expiresAt < new Date()) return { ok: false, reason: "invalid" };

  if (record.usedAt) {
    if (Date.now() - record.usedAt.getTime() < REUSE_GRACE_MS) return { ok: false, reason: "in_progress" };
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { tokenVersion: { increment: 1 } } }),
      prisma.refreshToken.deleteMany({ where: { familyId: record.familyId } }),
    ]);
    return { ok: false, reason: "reuse" };
  }

  // Tokens issued before a logout, password change or revocation carry an older version.
  if (record.tokenVersion !== record.user.tokenVersion || !record.user.isActive) return { ok: false, reason: "invalid" };

  // Only one request can win the claim; a concurrent one is told to retry shortly.
  const claimed = await prisma.refreshToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return { ok: false, reason: "in_progress" };

  await prisma.refreshToken.deleteMany({ where: { familyId: record.familyId, usedAt: { lt: new Date(Date.now() - USED_TOKEN_RETENTION_MS) } } });
  setRefreshCookie(res, await mintRefreshToken(record.userId, record.tokenVersion, record.familyId));
  return { ok: true, userId: record.userId };
}

/** Ends the session identified by a refresh token: its whole family is deleted. */
export async function endSession(raw: unknown): Promise<void> {
  if (typeof raw !== "string" || raw.length === 0) return;
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) }, select: { familyId: true } });
  if (record) await prisma.refreshToken.deleteMany({ where: { familyId: record.familyId } });
}
