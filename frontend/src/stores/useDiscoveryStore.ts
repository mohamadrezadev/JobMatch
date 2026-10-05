import { create } from "zustand";
import apiClient from "@/lib/api-client";
import type { DiscoveryResult } from "@/types/discovery";

interface State {
  key: string;
  generation: number;
  conversationId: string | null;
  pending: boolean;
  result: DiscoveryResult | null;
  error: string | null;
  reset: () => void;
  activate: (
    key: string,
    conversationId: string,
    autoSearch: boolean,
  ) => Promise<void>;
  search: () => Promise<void>;
}
function result(value: unknown): DiscoveryResult | null {
  if (value == null) return null;
  if (
    typeof value !== "object" ||
    !("jobs" in value) ||
    !Array.isArray(value.jobs) ||
    !("runId" in value) ||
    typeof value.runId !== "string"
  )
    throw new Error("Invalid discovery response");
  return value as DiscoveryResult;
}
function message(failure: unknown) {
  const transport = failure as { response?: unknown; code?: string };
  if (!transport.response && ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(transport.code ?? ""))
    return "ارتباط با سرور هنگام دریافت نتیجه قطع شد. گفتگو محفوظ است؛ برای دریافت نتیجه دوباره تلاش کن.";
  const code = (
    failure as { response?: { data?: { error?: { code?: string } } } }
  ).response?.data?.error?.code;
  return (
    (
      {
        JOB_DISCOVERY_UNAVAILABLE:
          "منابع جستجو در این نوبت پاسخ قابل استفاده ندادند. گفتگو محفوظ است؛ کمی بعد دوباره تلاش کن.",
        SEARCH_ROLE_REQUIRED: "ابتدا در گفتگو بگو دنبال چه شغلی هستی.",
        CONVERSATION_NOT_FOUND: "این گفتگو در حساب فعلی پیدا نشد. گفتگو را از تاریخچه دوباره باز کن.",
        JOB_SEARCH_PROVIDER_UNAVAILABLE:
          "سرویس جستجوی آگهی هنوز فعال نشده است. ترجیحاتت در گفتگو محفوظ است.",
        JOB_FETCH_PROVIDER_UNAVAILABLE: "سرویس خواندن آگهی‌ها هنوز آماده نیست.",
        JOB_FETCH_SECURITY_UNVERIFIED:
          "سرویس خواندن آگهی‌ها هنوز برای جستجوی امن آماده نیست.",
        JOB_SEARCH_IN_PROGRESS:
          "جستجوی این گفتگو در حال انجام است؛ کمی بعد نتیجه را دوباره بررسی کن.",
        RATE_LIMITED: "تعداد جستجوها زیاد شده؛ یک دقیقه دیگر دوباره تلاش کن.",
      } as Record<string, string>
    )[code ?? ""] ??
    "جستجوی فرصت‌ها انجام نشد. گفتگو محفوظ است؛ دوباره تلاش کن."
  );
}
export const useDiscoveryStore = create<State>((set, get) => ({
  key: "",
  generation: 0,
  conversationId: null,
  pending: false,
  result: null,
  error: null,
  reset: () =>
    set((state) => ({
      key: "",
      generation: state.generation + 1,
      conversationId: null,
      pending: false,
      result: null,
      error: null,
    })),
  activate: async (key, conversationId, autoSearch) => {
    if (get().key === key) return;
    set((state) => ({
      key,
      conversationId,
      generation: state.generation + 1,
      pending: false,
      result: null,
      error: null,
    }));
    if (autoSearch) {
      await get().search();
      return;
    }
    const generation = get().generation;
    set({ pending: true });
    try {
      const response = await apiClient.get<{ data: DiscoveryResult | null }>(
        `/api/job-discovery/conversations/${conversationId}/latest`,
      );
      if (generation === get().generation)
        set({ result: result(response.data.data) });
    } catch (error) {
      if (generation === get().generation) set({ error: message(error) });
    } finally {
      if (generation === get().generation) set({ pending: false });
    }
  },
  search: async () => {
    const { conversationId, pending, generation } = get();
    if (!conversationId || pending) return;
    set({ pending: true, error: null, result: null });
    try {
      const response = await apiClient.post<{ data: DiscoveryResult }>(
        "/api/job-discovery/search",
        { conversationId },
        { timeout: 70000 },
      );
      if (generation === get().generation)
        set({ result: result(response.data.data) });
    } catch (error) {
      if (generation !== get().generation) return;
      // A disconnected response does not imply that the server failed to save
      // the run. Restore the same owned context before reporting a transport error.
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status == null || status >= 500 || status === 409) {
        try {
          const restored = await apiClient.get<{ data: DiscoveryResult | null }>(
            `/api/job-discovery/conversations/${conversationId}/latest`,
            { timeout: 10000 },
          );
          if (generation !== get().generation) return;
          const saved = result(restored.data.data);
          if (saved) {
            set({ result: saved, error: null });
            return;
          }
        } catch { /* Keep the original failure when recovery is unavailable. */ }
      }
      if (generation === get().generation) set({ error: message(error) });
    } finally {
      if (generation === get().generation) set({ pending: false });
    }
  },
}));
