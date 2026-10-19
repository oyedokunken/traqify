-- Invitation tokens were stored in plaintext and returned by the API. They are now stored as
-- SHA-256 hashes. Hashing the existing values keeps links that were already emailed working,
-- because the server hashes whatever it receives before looking it up.
-- This statement is not idempotent: it must run exactly once (the migration history guarantees that).
UPDATE "staff_invites" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');
