-- Files are uploaded by the browser straight to storage with a signed URL and recorded here once
-- the server has inspected the stored bytes.
CREATE TYPE "UploadPurpose" AS ENUM ('AVATAR', 'ORG_LOGO', 'PRODUCT_IMAGE', 'DOWNLOADABLE');
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "purpose" "UploadPurpose" NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "declaredType" TEXT NOT NULL,
    "detectedType" TEXT,
    "maxBytes" INTEGER NOT NULL,
    "sizeBytes" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uploads_path_key" ON "uploads"("path");
CREATE INDEX "uploads_userId_idx" ON "uploads"("userId");
CREATE INDEX "uploads_organizationId_idx" ON "uploads"("organizationId");

ALTER TABLE "uploads" ADD CONSTRAINT "uploads_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Downloadable product files move to a private bucket and are referenced by storage path, never by a public URL.
-- A reference looks like "storage:<path inside the downloadables bucket>". Existing public URLs are converted;
-- links to anywhere else (an owner's own hosting) are left alone.
UPDATE "products"
SET "downloadUrl" = 'storage:' || regexp_replace("downloadUrl", '^https?://[^/]+/storage/v1/object/(public|sign)/downloadables/', '')
WHERE "downloadUrl" ~ '^https?://[^/]+/storage/v1/object/(public|sign)/downloadables/';
