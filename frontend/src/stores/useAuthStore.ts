import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/lib/api-client';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  onboardingStep: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  completeOnboarding: (step: number) => void;
  markProfileComplete: () => void;
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
        const res = await apiClient.post('/api/auth/login', { email, password });
        const { accessToken, refreshToken, user: userData } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user: userData, accessToken, isAuthenticated: true });
      },

      register: async (email, password, firstName, lastName) => {
        const res = await apiClient.post('/api/auth/register', { email, password, firstName, lastName });
        const { accessToken, refreshToken, user: userData } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user: userData, accessToken, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await apiClient.post('/api/auth/refresh', { refreshToken });
        const { accessToken } = res.data.data;
        localStorage.setItem('accessToken', accessToken);
        set({ accessToken });
      },

      completeOnboarding: (step) => set({ onboardingStep: step }),

      markProfileComplete: () => set({ isProfileComplete: true }),
    }),
    { name: 'auth-storage' },
  ),
);
