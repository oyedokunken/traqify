-- Brings a database that was last synced in May 2026 up to the schema the code
-- expects before the Phase 1 and 2 migrations. Everything here already existed in
-- schema.prisma but was never applied to production.

-- Newsletter subscribers become per-organization.
DROP INDEX IF EXISTS "newsletter_subscribers_email_key";
ALTER TABLE "newsletter_subscribers" ADD COLUMN "organizationId" TEXT;
CREATE UNIQUE INDEX "newsletter_subscribers_email_organizationId_key" ON "newsletter_subscribers"("email", "organizationId");
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-code attempt counter for OTP brute force protection.
ALTER TABLE "otp_verifications" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Session revocation support.
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- One-time codes for the Google sign-in hand-off (original shape; the refresh
-- tokens migration later makes the token columns optional).
CREATE TABLE "oauth_sessions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userData" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "oauth_sessions_code_key" ON "oauth_sessions"("code");
