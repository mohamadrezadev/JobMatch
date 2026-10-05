import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatPage from "./page";
import { useChatStore } from "@/stores/useChatStore";
import apiClient from "@/lib/api-client";
import { guestContinuationKey, guestDraftKey } from "@/lib/guest-chat-client";

const mockRouter = { replace: jest.fn() };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: Object.assign(
    () => ({ user: { id: "owner" }, isAuthenticated: true }),
    { persist: { hasHydrated: () => true, onFinishHydration: () => () => {} } },
  ),
}));
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
describe("Chat composer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    useChatStore.getState().reset(null);
    (apiClient.get as jest.Mock).mockImplementation((url: string) => Promise.resolve({ data: { data: url.endsWith('/latest') ? null : [] } }));
  });
  it("preserves a draft and displays an error after a failed send", async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error("offline"));
    render(<ChatPage />);
    const input = await screen.findByLabelText("پیام شما");
    fireEvent.change(input, { target: { value: "Backend" } });
    fireEvent.click(screen.getByRole("button", { name: "ارسال پیام" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(input).toHaveValue("Backend");
  });
  it("imports the guest history and keeps the unsent draft after authentication", async () => {
    sessionStorage.setItem(guestContinuationKey, "1");
    sessionStorage.setItem(guestDraftKey, "ادامه نوشته‌شده");
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { data: { conversationId: "imported" } },
    });
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data: {
          data: url.endsWith("/imported")
            ? {
                id: "imported",
                updatedAt: "2026-10-05",
                context: {
                  searchContext: { targetRoles: ["Backend Developer"] },
                  candidateFacts: {
                    skills: [],
                    deniedSkills: [],
                    statements: [],
                  },
                },
                messages: [
                  {
                    id: "guest-message",
                    role: "user",
                    content: "گفتگوی پیش از ورود",
                  },
                ],
              }
            : url.endsWith('/latest') ? null : [],
        },
      }),
    );
    render(<ChatPage />);
    await screen.findByText("گفتگوی پیش از ورود");
    expect(screen.getByRole("textbox", { name: "پیام شما" })).toHaveValue(
      "ادامه نوشته‌شده",
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/chat/guest/claim",
      {},
      { withCredentials: true },
    );
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });
  it("allows a role-only message and displays readiness after success", async () => {
    const context = {
      searchContext: { targetRoles: ["Backend Developer"] },
      candidateFacts: { skills: [], deniedSkills: [], statements: [] },
    };
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { data: { conversationId: "c", message: "ready", ...context } },
    });
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        data: {
          data: url.endsWith("/c")
            ? {
                id: "c",
                updatedAt: "2026-10-05",
                context,
                messages: [{ id: "m", role: "assistant", content: "ready" }],
              }
            : url.endsWith('/latest') ? null : [],
        },
      }),
    );
    render(<ChatPage />);
    const input = await screen.findByLabelText("پیام شما");
    fireEvent.change(input, { target: { value: "Backend" } });
    fireEvent.click(screen.getByRole("button", { name: "ارسال پیام" }));
    await screen.findByText("آماده ارسال به جستجوی فرصت‌ها");
    await waitFor(() => expect(input).toHaveValue(""));
  });
});
