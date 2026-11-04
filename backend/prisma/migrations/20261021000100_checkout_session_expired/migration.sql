-- A checkout that was never paid and has been given up on. A late payment can still complete it.
ALTER TYPE "CheckoutSessionStatus" ADD VALUE 'EXPIRED';
