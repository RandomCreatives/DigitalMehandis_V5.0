import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Send httponly cookies with every request
});

// Auto-refresh on 401 — cookies carry the refresh token automatically
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Refresh endpoint reads refresh_token from cookie and sets new access_token cookie
        await axios.post(`${API_URL}/api/v1/auth/refresh-token`, {}, { withCredentials: true });
        return api(original);
      } catch {
        // Refresh failed — redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
