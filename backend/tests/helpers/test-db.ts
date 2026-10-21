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
  return checkedTestUrl(env.DATABASE_URL_TEST || defaultUrl(env), "DATABASE_URL_TEST");
}

/**
 * The URL the application itself connects with. Normally the same as the test database; set DATABASE_URL_TEST_POOLED to
 * run the app through a transaction-mode pooler (PgBouncer) while schema setup still uses the direct connection.
 */
export function getAppDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.DATABASE_URL_TEST_POOLED ? checkedTestUrl(env.DATABASE_URL_TEST_POOLED, "DATABASE_URL_TEST_POOLED") : getTestDatabaseUrl(env);
}

function checkedTestUrl(url: string, name: string): string {
  let dbName: string;
  try {
    dbName = new URL(url).pathname.replace(/^\//, "");
  } catch {
    throw new Error(`${name} is not a valid URL.`);
  }
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests: database name "${dbName}" does not end in "_test". ` +
        `Point ${name} at a disposable test database.`
    );
  }
  return url;
}
