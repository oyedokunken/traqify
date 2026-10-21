import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

const USER_KEY = "traqify_user";

// Calls that must never trigger a silent refresh: a 401 from them is an answer, not an expired session.
const NO_REFRESH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/send-otp",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/accept-invite",
  "/api/auth/oauth-exchange",
];

// Refresh a little early so a request never leaves with a token that expires on the way.
const EXPIRY_MARGIN_MS = 30_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The expiry baked into a JWT, in ms since the epoch. Opaque or malformed tokens have none. */
const tokenExpiry = (token: string): number | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
};

const isStale = (token: string): boolean => {
  const expiry = tokenExpiry(token);
  return expiry !== null && expiry - Date.now() < EXPIRY_MARGIN_MS;
};

/** The cached profile doubles as a hint that this browser had a session, so public pages never try to refresh. */
const hasSessionHint = (): boolean => {
  try {
    return localStorage.getItem(USER_KEY) !== null;
  } catch {
    return false;
  }
};

const sessionExpiredError = (config: InternalAxiosRequestConfig) =>
  new AxiosError("The session has expired.", "ERR_SESSION_EXPIRED", config);

/**
 * Identical GET requests that are in flight at the same moment share one network call. Pages and components that ask
 * for the same data on load (or after a refocus) cost one request, not several. Writes are never merged, and requests
 * with different credentials or a cancel signal are kept apart.
 */
function dedupeGets(adapter: AxiosAdapter): AxiosAdapter {
  const inFlight = new Map<string, Promise<AxiosResponse>>();
  return (config) => {
    if ((config.method ?? "get").toLowerCase() !== "get" || config.signal || config.cancelToken) {
      return adapter(config);
    }
    const key = JSON.stringify([config.url, config.params ?? null, config.headers.Authorization ?? null]);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const request = adapter(config).finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
  };
}

interface SessionClientOptions {
  /** Replaces the network layer. Tests use it to stand in for the server. */
  adapter?: AxiosAdapter;
  /** Called once when the session is over and the user has to sign in again. */
  onSessionLost?: () => void;
}

/**
 * The API client and the session that goes with it.
 *
 * The access token lives only in memory, so a script injected into the page cannot read it from storage. The long lived
 * refresh token is an httpOnly cookie that the browser sends and scripts never see. After a page load the token is
 * gone, so the first request waits for one refresh and every other request waits for that same refresh. Nothing is sent
 * without a token it could have had, which keeps normal reloads free of 401 responses.
 */
export function createSessionClient(options: SessionClientOptions = {}) {
  let accessToken: string | null = null;
  let refreshInFlight: Promise<string | null> | null = null;
  let refreshRejected = false;

  const baseAdapter = axios.getAdapter(options.adapter ?? axios.defaults.adapter);
  const onSessionLost =
    options.onSessionLost ??
    (() => {
      window.location.href = "/login";
    });

  // Same-origin: every call goes to /api/* on this site and middleware.ts forwards it to the API.
  const api = axios.create({
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
    adapter: dedupeGets(baseAdapter),
  });
  const raw = axios.create({ withCredentials: true, adapter: baseAdapter });

  const clearSession = () => {
    accessToken = null;
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  async function requestRefresh(): Promise<string | null> {
    refreshRejected = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data } = await raw.post(
          "/api/auth/refresh",
          {},
          // The custom header makes the browser run a CORS preflight, which the API only approves for this app.
          { headers: { "X-Requested-By": "traqify" } }
        );
        accessToken = data.token;
        return accessToken;
      } catch (err) {
        const status = (err as AxiosError).response?.status;
        // 409: another tab is rotating the cookie right now. Retry once with the cookie it sets.
        if (status === 409 && attempt === 0) {
          await sleep(700);
          continue;
        }
        // Only an answer from the server means the session is over. A dropped connection or a 5xx says nothing about it.
        refreshRejected = status === 401 || status === 403 || status === 409;
        return null;
      }
    }
    return null;
  }

  /** Gets a new access token from the refresh cookie. Concurrent callers share one request. */
  const refreshSession = (): Promise<string | null> => {
    if (!refreshInFlight) {
      refreshInFlight = requestRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  };

  const endSession = () => {
    clearSession();
    onSessionLost();
  };

  api.interceptors.request.use(async (config) => {
    const url = config.url ?? "";
    const canRefresh = typeof window !== "undefined" && hasSessionHint() && !NO_REFRESH_PATHS.some((p) => url.startsWith(p));

    if (canRefresh && (!accessToken || isStale(accessToken))) {
      const token = await refreshSession();
      if (!token && refreshRejected) {
        // Sign out once however many requests were waiting on this refresh.
        if (hasSessionHint()) endSession();
        throw sessionExpiredError(config);
      }
    }
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
      const url = config?.url ?? "";

      if (
        error.response?.status === 401 &&
        config &&
        !config._retried &&
        typeof window !== "undefined" &&
        hasSessionHint() &&
        !NO_REFRESH_PATHS.some((path) => url.startsWith(path))
      ) {
        config._retried = true;
        const token = await refreshSession();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return api.request(config);
        }
        if (refreshRejected && hasSessionHint()) endSession();
      }
      return Promise.reject(error);
    }
  );

  return {
    api,
    refreshSession,
    clearSession,
    setAccessToken: (token: string | null) => {
      accessToken = token;
    },
    setSession: (token: string, user: object) => {
      accessToken = token;
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        /* storage unavailable: the session still works in memory */
      }
    },
    getStoredUser: () => {
      if (typeof window === "undefined") return null;
      try {
        const stored = localStorage.getItem(USER_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    },
  };
}

const client = createSessionClient();

export const { refreshSession, clearSession, setAccessToken, setSession, getStoredUser } = client;
export default client.api;
