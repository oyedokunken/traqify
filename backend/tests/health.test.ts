import request from "supertest";
import app from "../src/app";
import { getTestDatabaseUrl } from "./helpers/test-db";

describe("smoke", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("unknown routes return 404 JSON", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("protected routes require authentication", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
  });
});

describe("test database guard", () => {
  it("accepts a database whose name ends in _test", () => {
    expect(getTestDatabaseUrl({ DATABASE_URL_TEST: "postgresql://localhost:5433/foo_test" })).toContain("foo_test");
  });

  it("refuses any other database name", () => {
    expect(() => getTestDatabaseUrl({ DATABASE_URL_TEST: "postgresql://localhost:5432/postgres" })).toThrow(/_test/);
  });
});

describe("test database defaults", () => {
  it("builds the default URL from parts and honours overrides", () => {
    const url = new URL(getTestDatabaseUrl({ TEST_DB_PORT: "5432" }));
    expect(url.port).toBe("5432");
    expect(url.pathname).toBe("/traqify_test");
  });
});
