// Throwaway credentials for the disposable Docker/CI Postgres. They protect nothing.
const DEFAULTS = {
  user: "test_user",
  password: "test_only_not_a_secret",
  host: "localhost",
  port: "5433",
  database: "traqify_test",
};

function defaultUrl(env: NodeJS.ProcessEnv): string {
  // Assembled from parts so no credential-shaped connection string is committed.
  const url = new URL("postgresql://placeholder");
  url.username = env.TEST_DB_USER || DEFAULTS.user;
  url.password = env.TEST_DB_PASSWORD || DEFAULTS.password;
  url.hostname = env.TEST_DB_HOST || DEFAULTS.host;
  url.port = env.TEST_DB_PORT || DEFAULTS.port;
  url.pathname = `/${env.TEST_DB_NAME || DEFAULTS.database}`;
  return url.toString();
}

/**
 * Returns the test database URL and refuses anything whose database name does
 * not end in "_test". This is the guard that stops the suite (which truncates
 * every table) from ever running against a real database.
 */
export function getTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL_TEST || defaultUrl(env);
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
