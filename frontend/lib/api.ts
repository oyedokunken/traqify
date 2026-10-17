import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const USER_KEY = "traqify_user";

// The access token lives only in memory, so a script injected into the page cannot read it from storage.
// The long lived refresh token is an httpOnly cookie that the browser sends and scripts never see.
let accessToken: string | null = null;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Calls that must never trigger a silent refresh: a 401 from them is an answer, not an expired session.
const NO_REFRESH_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/send-otp",
  "/api/auth/check-email",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/accept-invite",
  "/api/auth/oauth-exchange",
];

/** The cached profile doubles as a hint that this browser had a session, so public pages never try to refresh. */
const hasSessionHint = (): boolean => {
  try {
    return localStorage.getItem(USER_KEY) !== null;
  } catch {
    return false;
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestRefresh(): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/refresh`,
        {},
        // The custom header makes the browser run a CORS preflight, which the API only approves for this app.
        { withCredentials: true, headers: { "X-Requested-By": "traqify" } }
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
      return null;
    }
  }
  return null;
}

let refreshInFlight: Promise<string | null> | null = null;

/** Gets a new access token from the refresh cookie. Concurrent callers share one request. */
export const refreshSession = (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

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
      clearSession();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setSession = (token: string, user: object) => {
  accessToken = token;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable: the session still works in memory */
  }
};

export const clearSession = () => {
  accessToken = null;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
};

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default api;
