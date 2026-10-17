import { execSync } from "child_process";
import { getTestDatabaseUrl } from "./helpers/test-db";

export default async function globalSetup(): Promise<void> {
  const url = getTestDatabaseUrl();
  // The committed migration history cannot build an empty database yet (see
  // README, known limitations), so the test schema is created from schema.prisma.
  execSync("npx prisma db push --skip-generate --force-reset --accept-data-loss", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
