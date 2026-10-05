import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GuestChat } from "./GuestChat";
import {
  guestChatClient,
  guestDraftKey,
  type GuestChatState,
} from "@/lib/guest-chat-client";
jest.mock("@/lib/guest-chat-client", () => ({
  guestChatClient: { get: jest.fn(), post: jest.fn() },
  guestDraftKey: "jobmatch-chat-draft",
  guestContinuationKey: "jobmatch-guest-continuation",
}));
const empty: GuestChatState = {
  messages: [],
  context: {
    searchContext: { targetRoles: [] },
    candidateFacts: { skills: [], deniedSkills: [], statements: [] },
  },
  remaining: 5,
  limit: 5,
  authRequired: false,
};
describe("Guest conversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (guestChatClient.get as jest.Mock).mockResolvedValue({
      data: { data: empty },
    });
  });
  it("keeps the draft after failure and successfully retries", async () => {
    (guestChatClient.post as jest.Mock)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        data: {
          data: {
            ...empty,
            remaining: 4,
            messages: [{ id: "a", role: "assistant", content: "پاسخ واقعی" }],
          },
        },
      });
    render(<GuestChat />);
    const input = screen.getByLabelText("پیام شما");
    fireEvent.change(input, { target: { value: "Backend" } });
    const send = screen.getByRole("button", { name: "ارسال پیام" });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await screen.findByRole("alert");
    expect(input).toHaveValue("Backend");
    fireEvent.click(send);
    await screen.findByText("پاسخ واقعی");
    expect(input).toHaveValue("");
  });
  it("gates exhausted sessions without losing the next draft or making an extra request", async () => {
    (guestChatClient.get as jest.Mock).mockResolvedValue({
      data: { data: { ...empty, remaining: 0, authRequired: true } },
    });
    render(<GuestChat />);
    await screen.findByText("گفتگو را از همین‌جا ادامه بده");
    fireEvent.change(screen.getByLabelText("پیام شما"), {
      target: { value: "ادامه گفتگو" },
    });
    expect(sessionStorage.getItem(guestDraftKey)).toBe("ادامه گفتگو");
    expect(screen.getByRole("button", { name: "ارسال پیام" })).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "ثبت‌نام و ادامه گفتگو" }),
    ).toHaveAttribute("href", "/register");
    expect(guestChatClient.post).not.toHaveBeenCalled();
  });
  it("handles a server-side quota rejection even when the local counter is stale", async () => {
    (guestChatClient.post as jest.Mock).mockRejectedValue({
      response: { data: { error: { code: "GUEST_LIMIT_REACHED" } } },
    });
    render(<GuestChat />);
    fireEvent.change(screen.getByLabelText("پیام شما"), {
      target: { value: "Backend" },
    });
    const send = screen.getByRole("button", { name: "ارسال پیام" });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await screen.findByText("گفتگو را از همین‌جا ادامه بده");
    expect(screen.getByLabelText("پیام شما")).toHaveValue("Backend");
  });
  it("offers a retry when initial connection fails", async () => {
    (guestChatClient.get as jest.Mock).mockRejectedValueOnce(
      new Error("offline"),
    );
    render(<GuestChat />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "تلاش دوباره" }));
    await waitFor(() => expect(guestChatClient.get).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
