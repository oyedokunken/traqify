import { validateEnv } from "../src/config/env";

const base = { JWT_SECRET: "x", DATABASE_URL: "x", PAYSTACK_SECRET_KEY: "x", FRONTEND_URL: "https://app.example.test" };

describe("validateEnv", () => {
  it("accepts a complete development configuration", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "development" } as NodeJS.ProcessEnv)).not.toThrow();
  });

  it.each(Object.keys(base))("names the missing variable %s", (key) => {
    const env = { ...base, NODE_ENV: "development" } as Record<string, string>;
    delete env[key];
    expect(() => validateEnv(env as NodeJS.ProcessEnv)).toThrow(key);
  });

  it("requires the proxy secret in production, so rate limits never silently see only the proxy", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow("PROXY_SHARED_SECRET");
    expect(() => validateEnv({ ...base, NODE_ENV: "production", PROXY_SHARED_SECRET: "x" } as NodeJS.ProcessEnv)).not.toThrow();
  });
});
