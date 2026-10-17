-- A payment gateway reference may back at most one payment, so a verified
-- reference cannot be replayed to fund a second order. NULL references (manual
-- and transfer payments) are not affected.
--
-- Before applying to an existing database, confirm there are no duplicates:
--   SELECT "reference", COUNT(*) FROM "payments"
--   WHERE "reference" IS NOT NULL GROUP BY "reference" HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");
