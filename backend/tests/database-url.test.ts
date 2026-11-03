import { pooledDatabaseUrl } from "../src/config/database";

// Assembled from parts, with escaped characters in the password, so no credential-shaped string is committed.
const POOLER = ["postgresql://", "postgres.abcdefghij", ":", "test_only%40not%3Fa%25secret", "@aws-1-eu-west-2.pooler.supabase.com"].join("");

describe("pooledDatabaseUrl", () => {
  it("leaves local and non-pooler URLs exactly as they are", () => {
    for (const url of ["postgresql://user:pw@localhost:5433/traqify_test", "postgresql://user:pw@db.example.com:5432/app?sslmode=require"]) {
      expect(pooledDatabaseUrl(url)).toBe(url);
    }
    expect(pooledDatabaseUrl(undefined)).toBeUndefined();
  });

  it("gives a Supabase pooler URL transaction mode and a usable connection limit", () => {
    expect(pooledDatabaseUrl(`${POOLER}:6543/postgres?pgbouncer=true&connection_limit=1`)).toBe(
      `${POOLER}:6543/postgres?pgbouncer=true&connection_limit=3`
    );
  });

  it("moves session mode (5432) to transaction mode (6543) and adds the flags", () => {
    expect(pooledDatabaseUrl(`${POOLER}:5432/postgres`)).toBe(`${POOLER}:6543/postgres?pgbouncer=true&connection_limit=3`);
  });

  it("never touches the credentials, even with escaped or odd characters", () => {
    const out = pooledDatabaseUrl(`${POOLER}:6543/postgres`)!;
    expect(out.startsWith(`${POOLER}:6543/`)).toBe(true);
    expect(out.slice(0, out.indexOf("@"))).toBe(POOLER.slice(0, POOLER.indexOf("@")));
  });

  it("keeps other query parameters", () => {
    expect(pooledDatabaseUrl(`${POOLER}:6543/postgres?pgbouncer=true&sslmode=require&connect_timeout=15`)).toContain("sslmode=require");
    expect(pooledDatabaseUrl(`${POOLER}:6543/postgres?pgbouncer=true&sslmode=require&connect_timeout=15`)).toContain("connect_timeout=15");
  });

  it("honours DB_CONNECTION_LIMIT within sane bounds", () => {
    const base = `${POOLER}:6543/postgres`;
    expect(pooledDatabaseUrl(base, "3")).toContain("connection_limit=3");
    expect(pooledDatabaseUrl(base, "10")).toContain("connection_limit=10");
    for (const bad of ["0", "-1", "11", "20", "abc", "1.5", "", undefined]) {
      expect(pooledDatabaseUrl(base, bad)).toContain("connection_limit=3");
    }
  });

  it("is idempotent", () => {
    const once = pooledDatabaseUrl(`${POOLER}:5432/postgres`)!;
    expect(pooledDatabaseUrl(once)).toBe(once);
  });
});
