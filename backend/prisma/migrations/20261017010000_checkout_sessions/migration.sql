-- Server created Paystack checkouts. The cart, customer and amount are fixed at
-- initialization so clients never supply a reference or a price.
CREATE TYPE "CheckoutSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED', 'REFUND_FAILED');

CREATE TABLE "checkout_sessions" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "accessCode" TEXT,
    "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "orderId" TEXT,
    "failureReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checkout_sessions_reference_key" ON "checkout_sessions"("reference");
CREATE UNIQUE INDEX "checkout_sessions_orderId_key" ON "checkout_sessions"("orderId");
CREATE INDEX "checkout_sessions_organizationId_idx" ON "checkout_sessions"("organizationId");

ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
