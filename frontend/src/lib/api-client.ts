import axios, { InternalAxiosRequestConfig } from "axios";
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});
let refreshing: Promise<string> | null = null;
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (typeof window === "undefined" || error.response?.status !== 401)
      return Promise.reject(error);
    const config = error.config as InternalAxiosRequestConfig & {
      retried?: boolean;
    };
    if (!config || config.url?.startsWith("/api/auth/"))
      return Promise.reject(error);
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken && !config.retried) {
      config.retried = true;
      try {
        refreshing ??= axios
          .post(`${baseURL}/api/auth/refresh`, { refreshToken })
          .then(async (response) => {
            const data = response.data.data ?? response.data;
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("refreshToken", data.refreshToken);
            const { useAuthStore } = await import("@/stores/useAuthStore");
            useAuthStore.setState({ accessToken: data.accessToken });
            return data.accessToken as string;
          })
          .finally(() => {
            refreshing = null;
          });
        const token = await refreshing;
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient.request(config);
      } catch {}
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    const { useAuthStore } = await import("@/stores/useAuthStore");
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isProfileComplete: false,
      onboardingStep: 0,
    });
    window.location.href = "/login";
    return Promise.reject(error);
  },
);
export default apiClient;
