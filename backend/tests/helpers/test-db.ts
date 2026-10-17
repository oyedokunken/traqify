const DEFAULT_TEST_URL = "postgresql://traqify:traqify@localhost:5433/traqify_test";

/**
 * Returns the test database URL and refuses anything whose database name does
 * not end in "_test". This is the guard that stops the suite (which truncates
 * every table) from ever running against a real database.
 */
export function getTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL_TEST || DEFAULT_TEST_URL;
  let dbName: string;
  try {
    dbName = new URL(url).pathname.replace(/^\//, "");
  } catch {
    throw new Error("DATABASE_URL_TEST is not a valid URL.");
  }
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests: database name "${dbName}" does not end in "_test". ` +
        "Point DATABASE_URL_TEST at a disposable test database."
    );
  }
  return url;
}
