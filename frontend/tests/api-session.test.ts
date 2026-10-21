import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionClient } from "../lib/api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const USER_KEY = "traqify_user";

/** A JWT-shaped token carrying only an expiry. The client reads exp to refresh early, nothing else. */
const jwtExpiringIn = (seconds: number) => {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${part({ alg: "HS256" })}.${part({ exp: Math.floor(Date.now() / 1000) + seconds })}.sig`;
};

interface ServerOptions {
  /** Whether the refresh cookie is still good. */
  cookieValid?: boolean;
  /** Make the refresh request fail like a dropped connection. */
  refreshNetworkError?: boolean;
}

const GOOD = "good-token";

/** A stand-in API: protected routes accept only the token that /refresh hands out, and every call is recorded. */
function fakeServer(options: ServerOptions = {}) {
  const log: string[] = [];
  const calls = { refresh: 0, network: 0 };

  const adapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    await sleep(5);
    calls.network++;
    let status = 200;
    let data: unknown = { ok: true, url };

    if (url === "/api/auth/refresh") {
      calls.refresh++;
      await sleep(25);
      if (options.refreshNetworkError) {
        log.push(`${method} ${url} network-error`);
        throw new AxiosError("Network Error", "ERR_NETWORK", config);
      }
      if (options.cookieValid === false) {
        status = 401;
        data = { error: "no session" };
      } else {
        data = { token: GOOD };
      }
    } else if (!url.startsWith("/api/store") && config.headers.Authorization !== `Bearer ${GOOD}`) {
      status = 401;
      data = { error: "unauthorized" };
    }

    log.push(`${method} ${url} ${status}`);
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) throw new AxiosError("failed", "ERR_BAD_REQUEST", config, null, response);
    return response;
  };

  return { adapter, log, calls };
}

function client(options: ServerOptions = {}) {
  const server = fakeServer(options);
  const onSessionLost = vi.fn();
  const session = createSessionClient({ adapter: server.adapter, onSessionLost });
  return { ...server, ...session, onSessionLost };
}

beforeEach(() => {
  localStorage.clear();
});

describe("boot sequence", () => {
  it("refreshes first and only then calls /me, so a reload shows no 401", async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: "u1" }));
    const { api, log } = client();

    await api.get("/api/auth/me");

    expect(log).toEqual(["POST /api/auth/refresh 200", "GET /api/auth/me 200"]);
  });

  it("makes concurrent requests wait for one shared refresh", async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: "u1" }));
    const { api, log, calls } = client();

    await Promise.all([
      api.get("/api/auth/me"),
      api.get("/api/reports/overview"),
      api.get("/api/reports/revenue-chart?period=30"),
      api.get("/api/reports/customer-chart?period=30"),
      api.get("/api/audit-logs/unread-count"),
    ]);

    expect(calls.refresh).toBe(1);
    expect(log.filter((line) => line.endsWith(" 401"))).toEqual([]);
    expect(log.filter((line) => line.endsWith(" 200"))).toHaveLength(6);
  });

  it("does not refresh on public pages where no session was ever started", async () => {
    const { api, log } = client();

    await api.get("/api/store/some-shop/products");

    expect(log).toEqual(["GET /api/store/some-shop/products 200"]);
  });

  it("does not refresh again once it holds a fresh token", async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: "u1" }));
    const { api, calls } = client();

    await api.get("/api/auth/me");
    await api.get("/api/reports/overview");
    await api.get("/api/orders");

    expect(calls.refresh).toBe(1);
  });

  it("refreshes before sending when the access token is about to expire", async () => {
    const { api, setSession, log } = client();
    setSession(jwtExpiringIn(5), { id: "u1" });

    await api.get("/api/reports/overview");

    expect(log).toEqual(["POST /api/auth/refresh 200", "GET /api/reports/overview 200"]);
  });

  it("sends a token that is still valid as it is, without refreshing first", async () => {
    const { api, setSession, log } = client();
    setSession(jwtExpiringIn(600), { id: "u1" });

    await api.get("/api/reports/overview").catch(() => undefined);

    // The fake server rejects this made-up token, so the first entry proves it went out without a refresh before it.
    expect(log[0]).toBe("GET /api/reports/overview 401");
  });

  it("recovers from a token the server rejects early by refreshing once and retrying", async () => {
    const { api, setSession, log } = client();
    setSession("opaque-but-revoked", { id: "u1" });

    const res = await api.get("/api/reports/overview");

    expect(res.status).toBe(200);
    expect(log).toEqual(["GET /api/reports/overview 401", "POST /api/auth/refresh 200", "GET /api/reports/overview 200"]);
  });
});

describe("a session that is really over", () => {
  it("rejects without sending the request, forgets the session and signs out once", async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: "u1" }));
    const { api, log, onSessionLost } = client({ cookieValid: false });

    const results = await Promise.allSettled([api.get("/api/auth/me"), api.get("/api/reports/overview")]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(log).toEqual(["POST /api/auth/refresh 401"]);
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(onSessionLost).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the refresh fails only because the network dropped", async () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: "u1" }));
    const { api, onSessionLost } = client({ refreshNetworkError: true });

    await expect(api.get("/api/auth/me")).rejects.toBeTruthy();

    expect(localStorage.getItem(USER_KEY)).not.toBeNull();
    expect(onSessionLost).not.toHaveBeenCalled();
  });
});

describe("duplicate requests", () => {
  it("shares one network call between identical GETs that are in flight together", async () => {
    const { api, setSession, calls } = client();
    setSession(GOOD, { id: "u1" });

    const [a, b, c] = await Promise.all([
      api.get("/api/reports/revenue-chart?period=30"),
      api.get("/api/reports/revenue-chart?period=30"),
      api.get("/api/reports/revenue-chart?period=30"),
    ]);

    expect(calls.network).toBe(1);
    expect([b.data, c.data]).toEqual([a.data, a.data]);
  });

  it("treats different URLs and different params as different requests", async () => {
    const { api, setSession, calls } = client();
    setSession(GOOD, { id: "u1" });

    await Promise.all([
      api.get("/api/reports/revenue-chart?period=30"),
      api.get("/api/reports/revenue-chart?period=7"),
      api.get("/api/reports/revenue-chart", { params: { period: 30 } }),
      api.get("/api/reports/revenue-chart", { params: { period: 90 } }),
    ]);

    expect(calls.network).toBe(4);
  });

  it("asks again once the earlier request has finished, so refreshing data still works", async () => {
    const { api, setSession, calls } = client();
    setSession(GOOD, { id: "u1" });

    await api.get("/api/reports/overview");
    await api.get("/api/reports/overview");

    expect(calls.network).toBe(2);
  });

  it("never merges writes", async () => {
    const { api, setSession, calls } = client();
    setSession(GOOD, { id: "u1" });

    await Promise.all([api.post("/api/orders", { n: 1 }), api.post("/api/orders", { n: 1 })]);

    expect(calls.network).toBe(2);
  });

  it("does not merge requests that carry different credentials", async () => {
    const { api, setSession, calls } = client();
    setSession(GOOD, { id: "u1" });
    const first = api.get("/api/reports/overview");
    await sleep(0);
    setSession("another-users-token", { id: "u2" });
    const second = api.get("/api/reports/overview").catch(() => undefined);

    await Promise.all([first, second]);

    expect(calls.network).toBeGreaterThanOrEqual(2);
  });
});
