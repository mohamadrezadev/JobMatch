import { create } from "zustand";
import { persist } from "zustand/middleware";
import apiClient from "@/lib/api-client";
import type { User } from "@/types/user";
import { unwrap } from "@/lib/pathly-data";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  onboardingStep: number;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  completeOnboarding: (step: number) => void;
  markProfileComplete: () => void;
  restoreProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isProfileComplete: false,
      onboardingStep: 0,

      login: async (email, password) => {
        const res = await apiClient.post("/api/auth/login", {
          email,
          password,
        });
        const {
          accessToken,
          refreshToken,
          user: userData,
        } = unwrap(res.data) as {
          accessToken: string;
          refreshToken: string;
          user: User;
        };
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        set({
          user: userData,
          accessToken,
          isAuthenticated: true,
          isProfileComplete: false,
          onboardingStep: 0,
        });
        try {
          const profile = unwrap(
            (await apiClient.get("/api/users/profile")).data,
          ) as { isProfileComplete: boolean };
          set({ isProfileComplete: profile.isProfileComplete });
        } catch {}
      },

      register: async (email, password, firstName, lastName) => {
        const res = await apiClient.post("/api/auth/register", {
          email,
          password,
          firstName,
          lastName,
        });
        const {
          accessToken,
          refreshToken,
          user: userData,
        } = unwrap(res.data) as {
          accessToken: string;
          refreshToken: string;
          user: User;
        };
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        set({
          user: userData,
          accessToken,
          isAuthenticated: true,
          isProfileComplete: false,
          onboardingStep: 0,
        });
      },

      logout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isProfileComplete: false,
          onboardingStep: 0,
        });
      },

      refreshToken: async () => {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");
        const res = await apiClient.post("/api/auth/refresh", { refreshToken });
        const { accessToken, refreshToken: rotatedRefreshToken } = unwrap(
          res.data,
        ) as { accessToken: string; refreshToken: string };
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", rotatedRefreshToken);
        set({ accessToken });
      },

      completeOnboarding: (step) => set({ onboardingStep: step }),

      markProfileComplete: () => set({ isProfileComplete: true }),
      restoreProfile: async () => {
        try {
          const profile = unwrap(
            (await apiClient.get("/api/users/profile")).data,
          ) as { isProfileComplete: boolean };
          set({ isProfileComplete: profile.isProfileComplete });
        } catch {
          set({ isProfileComplete: false });
        }
      },
    }),
    { name: "auth-storage" },
  ),
);
