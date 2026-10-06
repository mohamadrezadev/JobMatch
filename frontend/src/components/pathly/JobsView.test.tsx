import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { JobsView } from "./JobsView";
import apiClient from "@/lib/api-client";
let mockAuthenticated = false;
jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: mockAuthenticated,
    user: mockAuthenticated ? { id: "owner" } : null,
  }),
}));
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
describe("Reference job discovery", () => {
  it("shows requirements without a percentage or invented skill gaps when no resume exists", async () => {
    mockAuthenticated = true;
    (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        items: [
          {
            id: "no-resume",
            title: "حسابدار",
            company: "شرکت واقعی",
            location: "Tehran",
            requiredSkills: [{ name: "Excel" }],
            match: {
              matchScore: null,
              status: "insufficient_data",
              reason: "RESUME_REQUIRED",
              explanation:
                "هنوز رزومه‌ای ذخیره نکرده‌اید؛ درصد تطابق محاسبه نشده است.",
              breakdown: { skills: { matched: [], missing: ["Excel"] } },
            },
          },
        ],
      },
    });
    render(<JobsView />);
    await screen.findByText(/هنوز رزومه‌ای ذخیره نکرده‌اید/);
    expect(screen.queryByText("تطابق با شما")).not.toBeInTheDocument();
    expect(screen.queryByText("شکاف مهارت (Skill Gap)")).not.toBeInTheDocument();
    expect(screen.getByText(/مهارت‌های موردنیاز آگهی/)).toBeInTheDocument();
    expect(screen.queryByText("نیاز به Excel")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ساخت رزومه برای محاسبه/ }),
    ).toHaveAttribute("href", "/resume?job=no-resume");
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticated = false;
    window.history.replaceState({}, "", "/jobs?preview=design");
  });
  it("searches skills and selects a matching detail", () => {
    render(<JobsView />);
    fireEvent.change(screen.getByLabelText("جستجوی فرصت‌ها"), {
      target: { value: "Tailwind" },
    });
    expect(
      screen.getAllByRole("button", { name: /شرکت پیشگامان فناوری/ }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /استارتاپ هوش‌نو/ }),
    ).not.toBeInTheDocument();
  });
  it("does not show samples in ordinary anonymous navigation", () => {
    window.history.replaceState({}, "", "/jobs");
    render(<JobsView />);
    expect(
      screen.queryByRole("button", { name: /شرکت پیشگامان فناوری/ }),
    ).not.toBeInTheDocument();
  });
  it("supports hybrid and remote filters with an empty state", () => {
    render(<JobsView />);
    fireEvent.change(screen.getByLabelText("شهر و نوع حضور"), {
      target: { value: "hybrid" },
    });
    expect(
      screen.getAllByRole("button", { name: /شرکت پیشگامان فناوری/ }),
    ).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("شهر و نوع حضور"), {
      target: { value: "remote" },
    });
    expect(
      screen.getAllByRole("button", { name: /استارتاپ هوش‌نو/ }),
    ).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("جستجوی فرصت‌ها"), {
      target: { value: "not-found" },
    });
    expect(
      screen.getByText("هیچ شغلی با این مشخصات یافت نشد."),
    ).toBeInTheDocument();
  });
  it("removes filter chips", () => {
    render(<JobsView />);
    fireEvent.click(screen.getByRole("button", { name: "حذف فیلتر جونیور" }));
    fireEvent.click(
      screen.getByRole("button", { name: "حذف فیلتر فرانت‌اند" }),
    );
    expect(screen.getByText("بدون محدودیت")).toBeInTheDocument();
  });
  it("keeps authenticated API failures visible instead of supplying samples", async () => {
    mockAuthenticated = true;
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("offline"));
    render(<JobsView />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "دریافت فرصت‌ها ممکن نشد",
    );
    expect(
      screen.queryByRole("button", { name: /شرکت پیشگامان فناوری/ }),
    ).not.toBeInTheDocument();
  });
  it("accepts bare backend responses and reports an actual empty result", async () => {
    mockAuthenticated = true;
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { items: [] } });
    render(<JobsView />);
    expect(
      await screen.findByText("هیچ شغلی با این مشخصات یافت نشد."),
    ).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/jobs\/search\?page=1&pageSize=12/),
    );
    expect(screen.queryByText("۹۲٪")).not.toBeInTheDocument();
  });
  it("requests backend pagination and filters, and persists rejection reason", async () => {
    mockAuthenticated = true;
    window.history.replaceState({}, "", "/jobs");
    const match = {
      matchScore: 75,
      breakdown: { skills: { matched: ["Node.js"], missing: ["Docker"] } },
      explanation: "نوع همکاری مناسب شماست.",
    };
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        items: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            title: "Backend",
            company: "Actual",
            location: "Tehran",
            workType: "Remote",
            requiredSkills: [{ name: "Node.js" }],
            match,
          },
        ],
        pages: 2,
      },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
    render(<JobsView />);
    expect(
      await screen.findByText("نوع همکاری مناسب شماست."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "صفحه بعد" }));
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("page=2"),
      ),
    );
    fireEvent.change(screen.getByLabelText("شهر و نوع حضور"), {
      target: { value: "remote" },
    });
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("workType=Remote"),
      ),
    );
    await screen.findByText("نوع همکاری مناسب شماست.");
    fireEvent.change(screen.getByLabelText("دلیل عدم علاقه"), {
      target: { value: "Salary" },
    });
    fireEvent.click(screen.getByRole("button", { name: "علاقه ندارم" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/feedback",
        expect.objectContaining({ rating: "NotInterested", reason: "Salary" }),
      ),
    );
  });
});
