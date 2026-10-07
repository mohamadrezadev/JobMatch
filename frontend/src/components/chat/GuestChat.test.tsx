import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { GuestChat } from "./GuestChat";
import { sendGuestMessage } from "@/lib/guest-chat-stream";
jest.mock("@/lib/guest-chat-stream", () => ({
  sendGuestMessage: jest.fn(async (message: string) => {
    const { guestChatClient } = require("@/lib/guest-chat-client");
    return (await guestChatClient.post("/api/chat/guest/message", { message }))
      .data.data;
  }),
}));
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
  it("offers complete searchable examples with a role, location, and count", async () => {
    render(<GuestChat />);
    const suggestion = await screen.findByRole("button", {
      name: "۱ آگهی برنامه‌نویس بک‌اند .NET در تهران پیدا کن",
    });
    fireEvent.click(suggestion);
    expect(screen.getByLabelText("پیام شما")).toHaveValue(
      "۱ آگهی برنامه‌نویس بک‌اند .NET در تهران پیدا کن",
    );
    expect(
      screen.queryByText("فقط حضوری، حداقل حقوق ۳۰ میلیون"),
    ).not.toBeInTheDocument();
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
  it("keeps conversation usable after naming a role before all five messages are consumed", async () => {
    (guestChatClient.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          ...empty,
          remaining: 4,
          context: {
            ...empty.context,
            searchContext: { targetRoles: ["حسابداری"] },
          },
        },
      },
    });
    render(<GuestChat />);
    const input = screen.getByLabelText("پیام شما");
    fireEvent.change(input, { target: { value: "تهران" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "ارسال پیام" })).toBeEnabled(),
    );
    expect(
      screen.queryByRole("link", { name: /ثبت‌نام و ادامه/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/برای یافتن آگهی‌های واقعی/),
    ).not.toBeInTheDocument();
  });
  it("shows search progress and actual job links after the role message", async () => {
    let resolveMessage!: (value: unknown) => void;
    (guestChatClient.post as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMessage = resolve;
        }),
    );
    render(<GuestChat />);
    fireEvent.change(screen.getByLabelText("پیام شما"), {
      target: { value: "حسابدار" },
    });
    const send = screen.getByRole("button", { name: "ارسال پیام" });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await screen.findByText(/در حال بررسی عنوان شغلی، شهر و شرایط شما/);
    resolveMessage({
      data: {
        data: {
          ...empty,
          remaining: 3,
          messages: [
            { id: "a", role: "assistant", content: "۱ موقعیت مرتبط پیدا شد." },
          ],
          discovery: {
            partial: false,
            sources: [],
            jobs: [
              {
                title: "حسابدار",
                company: "شرکت نمونه",
                location: "تهران",
                workType: "OnSite",
                salaryMin: 35000000,
                salaryMax: null,
                currency: "TOMAN",
                salaryPeriod: "MONTHLY",
                source: "jobinja.ir",
                sourceUrl: "https://jobinja.ir/jobs/1",
                warnings: [],
              },
            ],
          },
        },
      },
    });
    await screen.findByRole("heading", { name: "حسابدار" });
    expect(
      screen.getByRole("link", { name: "مشاهده آگهی اصلی" }),
    ).toHaveAttribute("href", "https://jobinja.ir/jobs/1");
    expect(screen.getByText(/۳۵٬۰۰۰٬۰۰۰ تومان/)).toBeInTheDocument();
  });
  it("shows real source phases and provider/site failures while retaining healthy results", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    (sendGuestMessage as jest.Mock).mockImplementationOnce(
      async (_message, receive) => {
        receive({
          type: "agent.started",
          data: { targetValidJobs: 10, searchMode: "adaptive" },
        });
        receive({
          type: "source.progress",
          data: { source: "jobvision.ir", stage: "extract" },
        });
        await gate;
        receive({
          type: "source.failed",
          data: {
            source: "e-estekhdam.com",
            issue: {
              category: "site",
              message: "صفحه سایت خطای اتصال نشان داد.",
              retryable: true,
            },
          },
        });
        return {
          ...empty,
          discovery: {
            jobs: [],
            partial: true,
            sources: [
              {
                source: "e-estekhdam.com",
                failed: true,
                found: 1,
                accepted: 0,
                rejected: 1,
                issue: {
                  category: "site",
                  message: "صفحه سایت خطای اتصال نشان داد.",
                  retryable: true,
                },
              },
              {
                source: "irantalent.com",
                failed: true,
                found: 1,
                accepted: 0,
                rejected: 1,
                issue: {
                  category: "provider",
                  message: "سرویس دریافت پاسخ معتبر نداد.",
                  retryable: true,
                },
              },
            ],
          },
        };
      },
    );
    render(<GuestChat />);
    fireEvent.change(screen.getByLabelText("پیام شما"), {
      target: { value: "Backend" },
    });
    const send = screen.getByRole("button", { name: "ارسال پیام" });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await screen.findAllByText(/جاب‌ویژن: در حال استخراج اطلاعات/);
    expect(screen.getByText("هدف جستجو: ۱۰ آگهی با شرایط تأییدشده")).toBeInTheDocument();
    expect(screen.getByText(/هدف پیش‌فرض، ۵ آگهی/)).toBeInTheDocument();
    await act(async () => {
      finish();
    });
    await waitFor(() =>
      expect(screen.getByLabelText("مشکلات بررسی منابع")).toHaveTextContent(
        /ایران‌تلنت.*خطای سرویس/,
      ),
    );
    expect(screen.getByLabelText("مشکلات بررسی منابع")).toHaveTextContent(
      /ای‌استخدام.*خطای صفحهٔ سایت/,
    );
  });
  it("recovers a committed matching turn after losing the stream without posting twice", async () => {
    (sendGuestMessage as jest.Mock).mockRejectedValueOnce(
      new Error("stream lost"),
    );
    (guestChatClient.get as jest.Mock)
      .mockResolvedValueOnce({ data: { data: empty } })
      .mockResolvedValueOnce({
        data: {
          data: {
            ...empty,
            remaining: 4,
            messages: [
              { id: "u", role: "user", content: "Backend" },
              { id: "a", role: "assistant", content: "پاسخ ذخیره‌شده" },
            ],
          },
        },
      });
    render(<GuestChat />);
    fireEvent.change(screen.getByLabelText("پیام شما"), {
      target: { value: "Backend" },
    });
    const send = screen.getByRole("button", { name: "ارسال پیام" });
    await waitFor(() => expect(send).toBeEnabled());
    fireEvent.click(send);
    await screen.findByText("پاسخ ذخیره‌شده");
    expect(screen.getByRole("textbox", { name: "پیام شما" })).toHaveValue("");
    expect(sendGuestMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("starts discovery for an already prepared guest conversation", async () => {
    const prepared = {
      ...empty,
      remaining: 3,
      context: {
        ...empty.context,
        searchContext: {
          targetRoles: ["حسابدار"],
          workTypes: ["OnSite"],
          minimumSalary: 30000000,
        },
      },
    };
    (guestChatClient.get as jest.Mock).mockResolvedValue({
      data: { data: prepared },
    });
    (guestChatClient.post as jest.Mock).mockResolvedValue({
      data: {
        data: {
          ...prepared,
          discovery: { jobs: [], sources: [], partial: false },
        },
      },
    });
    render(<GuestChat />);
    const start = await screen.findByRole("button", {
      name: "جستجوی فرصت‌های شغلی",
    });
    fireEvent.click(start);
    await waitFor(() =>
      expect(guestChatClient.post).toHaveBeenCalledWith(
        "/api/chat/guest/message",
        { message: "دوباره جستجو کن" },
      ),
    );
    await screen.findByRole("region", { name: "نتایج جستجوی مهمان" });
  });
});
