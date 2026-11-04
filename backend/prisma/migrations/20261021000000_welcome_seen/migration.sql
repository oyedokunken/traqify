-- Whether the welcome screen has been shown is kept on the user, so it follows them across browsers and devices
-- instead of living in one browser's local storage.
ALTER TABLE "users" ADD COLUMN "welcomeSeenAt" TIMESTAMP(3);

-- Everyone who already has a workspace has been through onboarding; do not greet them as new.
UPDATE "users" SET "welcomeSeenAt" = "createdAt" WHERE "organizationId" IS NOT NULL;
