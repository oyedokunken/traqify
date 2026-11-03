import request from "supertest";
import app from "../src/app";
import { allowedOrigins, CANONICAL_ORIGIN } from "../src/config/origins";

const NEW_DOMAIN = "https://traqify.oyedokun.dev";
const LOCAL = "http://localhost:3000";

describe("allowedOrigins", () => {
  const saved = process.env.FRONTEND_URL;
  afterEach(() => {
    process.env.FRONTEND_URL = saved;
  });

  it("is the configured frontend plus the production domain", () => {
    process.env.FRONTEND_URL = LOCAL;
    expect(allowedOrigins()).toEqual([LOCAL, NEW_DOMAIN]);
  });

  it("normalises a trailing slash or path and does not repeat the production domain", () => {
    process.env.FRONTEND_URL = `${NEW_DOMAIN}/`;
    expect(allowedOrigins()).toEqual([NEW_DOMAIN]);
    process.env.FRONTEND_URL = `${LOCAL}/some/path`;
    expect(allowedOrigins()).toEqual([LOCAL, NEW_DOMAIN]);
  });

  it("falls back to local development when nothing is configured, and ignores junk", () => {
    delete process.env.FRONTEND_URL;
    expect(allowedOrigins()).toEqual([LOCAL, NEW_DOMAIN]);
    process.env.FRONTEND_URL = "not a url";
    expect(allowedOrigins()).toEqual([LOCAL, NEW_DOMAIN]);
  });

  it("exposes the production domain as the canonical origin", () => {
    expect(CANONICAL_ORIGIN).toBe(NEW_DOMAIN);
  });
});

describe("CORS", () => {
  const preflight = (origin: string) =>
    request(app)
      .options("/api/auth/refresh")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "x-requested-by,content-type");

  it.each([NEW_DOMAIN, LOCAL])("allows %s with credentials", async (origin) => {
    const res = await preflight(origin);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it.each(["https://traqify.vercel.app", "https://evil.example", "https://traqify.oyedokun.dev.evil.example", "http://traqify.oyedokun.dev"])(
    "does not allow %s",
    async (origin) => {
      const res = await preflight(origin);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    }
  );
});

describe("the refresh and logout origin check", () => {
  const refreshFrom = (origin: string | null, header = true) => {
    let req = request(app).post("/api/auth/refresh");
    if (origin) req = req.set("Origin", origin);
    if (header) req = req.set("X-Requested-By", "traqify");
    return req;
  };

  it.each([NEW_DOMAIN, LOCAL])("accepts a request from %s (it then fails only for lack of a session)", async (origin) => {
    expect((await refreshFrom(origin)).status).toBe(401);
  });

  it("accepts the Referer when there is no Origin", async () => {
    const res = await request(app).post("/api/auth/refresh").set("Referer", `${NEW_DOMAIN}/dashboard`).set("X-Requested-By", "traqify");
    expect(res.status).toBe(401);
  });

  it.each(["https://evil.example", "https://traqify.vercel.app", "https://traqify.oyedokun.dev.evil.example"])("refuses %s", async (origin) => {
    expect((await refreshFrom(origin)).status).toBe(403);
  });

  it("refuses a request with no origin, or without the custom header", async () => {
    expect((await refreshFrom(null)).status).toBe(403);
    expect((await refreshFrom(NEW_DOMAIN, false)).status).toBe(403);
  });
});
