-- AddColumn: slug to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- AddUniqueConstraint: slug + organizationId
CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_organizationId_key"
  ON "products"("slug", "organizationId");
