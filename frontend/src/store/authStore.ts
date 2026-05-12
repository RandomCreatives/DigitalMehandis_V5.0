import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email, password) => {
        await api.post("/auth/login", { email, password });
        set({ accessToken: "cookie", refreshToken: "cookie" });
      },

      register: async (payload) => {
        await api.post("/auth/register", payload);
      },

      logout: async () => {
        await api.post("/auth/logout");
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    { name: "auth-store", partialize: (s) => ({ user: s.user }) }
  )
);
