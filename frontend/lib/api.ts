import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("traqify_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const refreshToken = localStorage.getItem("traqify_refresh");
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
          localStorage.setItem("traqify_token", data.token);
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return api.request(error.config);
        } catch (refreshErr: any) {
          const status = refreshErr?.response?.status;
          if (!status || status === 401 || status === 403) {
            localStorage.removeItem("traqify_token");
            localStorage.removeItem("traqify_refresh");
            localStorage.removeItem("traqify_user");
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export const setAuthTokens = (token: string, refreshToken: string, user: object) => {
  localStorage.setItem("traqify_token", token);
  localStorage.setItem("traqify_refresh", refreshToken);
  localStorage.setItem("traqify_user", JSON.stringify(user));
};

export const clearAuthTokens = () => {
  localStorage.removeItem("traqify_token");
  localStorage.removeItem("traqify_refresh");
  localStorage.removeItem("traqify_user");
};

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("traqify_user");
  return raw ? JSON.parse(raw) : null;
};

export default api;
