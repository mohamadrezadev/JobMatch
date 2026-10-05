import { create } from "zustand";
import apiClient from "@/lib/api-client";
import type {
  ChatReply,
  Conversation,
  ConversationSummary,
} from "@/types/chat";

interface ChatState {
  discoveryTrigger: number;
  owner: string | null;
  generation: number;
  conversations: ConversationSummary[];
  active: Conversation | null;
  pending: boolean;
  error: string | null;
  reset: (owner: string | null) => void;
  startNew: () => void;
  loadList: () => Promise<void>;
  select: (id: string) => Promise<void>;
  send: (message: string) => Promise<boolean>;
}
export const useChatStore = create<ChatState>((set, get) => ({
  discoveryTrigger: 0,
  owner: null,
  generation: 0,
  conversations: [],
  active: null,
  pending: false,
  error: null,
  reset: (owner) =>
    set((state) => ({
      owner,
      discoveryTrigger: 0,
      generation: state.generation + 1,
      conversations: [],
      active: null,
      pending: false,
      error: null,
    })),
  startNew: () => {
    if (!get().pending) set({ active: null, error: null, discoveryTrigger: 0 });
  },
  loadList: async () => {
    const { generation, owner } = get();
    if (!owner) return;
    try {
      const response = await apiClient.get<{ data: ConversationSummary[] }>(
        "/api/chat/conversations",
      );
      if (get().generation === generation)
        set({ conversations: response.data.data });
    } catch {
      if (get().generation === generation)
        set({ error: "دریافت فهرست گفتگوها ممکن نشد. دوباره تلاش کنید." });
    }
  },
  select: async (id) => {
    if (get().pending || !get().owner) return;
    const generation = get().generation;
    set({ discoveryTrigger: 0 });
    set({ pending: true, error: null });
    try {
      const response = await apiClient.get<{ data: Conversation }>(
        `/api/chat/conversations/${id}`,
      );
      if (get().generation === generation) set({ active: response.data.data });
    } catch {
      if (get().generation === generation)
        set({ error: "گفتگو بارگذاری نشد. دوباره تلاش کنید." });
    } finally {
      if (get().generation === generation) set({ pending: false });
    }
  },
  send: async (message) => {
    const { pending, owner, generation, active } = get();
    if (pending || !owner || !message.trim()) return false;
    set({ pending: true, error: null });
    try {
      const response = await apiClient.post<{ data: ChatReply }>(
        "/api/chat/message",
        { message, ...(active ? { conversationId: active.id } : {}) },
      );
      if (get().generation !== generation) return false;
      const data = response.data.data;
      // The turn is already committed. Keep it visible even if refreshing history fails.
      const time = new Date().toISOString();
      const optimistic: Conversation = {
        id: data.conversationId,
        updatedAt: time,
        context: {
          searchContext: data.searchContext,
          candidateFacts: data.candidateFacts,
        },
        messages: [
          ...(active?.messages ?? []),
          {
            id: `local-user-${time}`,
            role: "user",
            content: message,
            sequence: (active?.messages.length ?? 0) + 1,
            createdAt: time,
          },
          {
            id: `local-assistant-${time}`,
            role: "assistant",
            content: data.message,
            sequence: (active?.messages.length ?? 0) + 2,
            createdAt: time,
          },
        ],
      };
      set((state) => ({
        active: optimistic,
        discoveryTrigger: data.readyForSearch && ['JOB_SEARCH', 'UPDATE_SEARCH'].includes(data.intent) ? state.discoveryTrigger + 1 : 0,
        conversations: [
          { id: optimistic.id, updatedAt: time },
          ...state.conversations.filter((c) => c.id !== optimistic.id),
        ],
      }));
      try {
        const history = await apiClient.get<{ data: Conversation }>(
          `/api/chat/conversations/${data.conversationId}`,
        );
        if (get().generation === generation) set({ active: history.data.data });
      } catch {
        if (get().generation === generation)
          set({
            error:
              "پیام ذخیره شد؛ دریافت تاریخچه کامل ممکن نشد. گفتگو را دوباره باز کنید.",
          });
      }
      return get().generation === generation;
    } catch {
      if (get().generation === generation)
        set({
          error:
            "ارسال تأیید نشد. متن حفظ شده است؛ پیش از تلاش دوباره تاریخچه را بررسی کنید.",
        });
      return false;
    } finally {
      if (get().generation === generation) set({ pending: false });
    }
  },
}));
