import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: true,

      login: async (email, password) => {
        await api.post("/auth/login", { email, password });
        // Fetch user profile via cookie (withCredentials sends the access_token cookie)
        const { data } = await api.get<User>("/auth/me");
        set({ user: data, loading: false });
      },

      register: async (payload) => {
        await api.post("/auth/register", payload);
        // After register, user is already authenticated via cookies set by backend
        const { data } = await api.get<User>("/auth/me");
        set({ user: data, loading: false });
      },

      logout: async () => {
        await api.post("/auth/logout", {});
        set({ user: null, loading: false });
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      },

      checkAuth: async () => {
        try {
          const { data } = await api.get<User>("/auth/me");
          set({ user: data, loading: false });
        } catch {
          set({ user: null, loading: false });
        }
      },
    }),
    { name: "auth-store", partialize: (s) => ({ user: s.user }) }
  )
);
