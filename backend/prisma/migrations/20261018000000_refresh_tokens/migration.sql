-- Opaque, rotating refresh tokens kept as hashes. They replace the long lived
-- refresh JWT that the browser used to keep in localStorage.
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OAuth sessions now only remember who signed in; tokens are minted at exchange time.
ALTER TABLE "oauth_sessions" ADD COLUMN "userId" TEXT;
ALTER TABLE "oauth_sessions" ALTER COLUMN "token" DROP NOT NULL;
ALTER TABLE "oauth_sessions" ALTER COLUMN "refreshToken" DROP NOT NULL;
ALTER TABLE "oauth_sessions" ALTER COLUMN "userData" DROP NOT NULL;
