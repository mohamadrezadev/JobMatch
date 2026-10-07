import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardView } from "./DashboardView";
import apiClient from "@/lib/api-client";
jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: { id: "u", firstName: "نام" },
  }),
}));
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
const emptyDashboard = {
  profileCompletion: 0,
  resumeCount: 0,
  interestedCount: 0,
  recommendations: [],
  interestedJobs: [],
  recentDiscoveries: [],
  recentConversations: [],
  recentActivity: [],
};
beforeEach(() => jest.clearAllMocks());
it("displays actual zero counts and actions for an empty account", async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: {
      profileCompletion: 0,
      resumeCount: 0,
      interestedCount: 0,
      recommendations: [],
      interestedJobs: [],
      recentDiscoveries: [],
      recentConversations: [],
      recentActivity: [],
    },
  });
  render(<DashboardView />);
  expect(await screen.findByText("جستجو را شروع کنید.")).toHaveAttribute(
    "href",
    "/chat",
  );
  expect(screen.queryByText("۹۲٪")).not.toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("link", { name: "تکمیل پروفایل" })).toHaveAttribute(
    "href",
    "/profile",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  expect(
    screen.getByText(/تاریخچه جستجو و فعالیت/).closest("details"),
  ).not.toHaveAttribute("open");
});

it("offers resume creation after profile completion, then search when ready", async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: { ...emptyDashboard, profileCompletion: 100 },
  });
  const view = render(<DashboardView />);
  expect(
    await screen.findByRole("link", { name: "ساخت رزومه" }),
  ).toHaveAttribute("href", "/resume");
  view.unmount();
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: { ...emptyDashboard, profileCompletion: 100, resumeCount: 2 },
  });
  render(<DashboardView />);
  expect(
    await screen.findByRole("link", { name: "جستجو با دستیار" }),
  ).toHaveAttribute("href", "/chat");
});

it("opens saved jobs directly and keeps unknown match scores out of the UI", async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: {
      ...emptyDashboard,
      interestedCount: 1,
      interestedJobs: [
        {
          id: "saved-1",
          title: "Frontend Developer",
          company: "Example",
          location: "تهران",
        },
      ],
      recommendations: [
        {
          id: "job-1",
          title: "Backend Developer",
          company: "Example",
          match: { matchScore: 0 },
        },
      ],
      recentConversations: [
        { id: "chat-1", messages: [{ content: "دنبال کار دورکاری هستم" }] },
      ],
    },
  });
  render(<DashboardView />);
  expect(
    await screen.findByRole("link", { name: /Frontend Developer/ }),
  ).toHaveAttribute("href", "/jobs/saved-1");
  expect(
    screen.getByRole("link", { name: /دنبال کار دورکاری هستم/ }),
  ).toHaveAttribute("href", "/chat?conversation=chat-1");
  expect(screen.getByText("تطابق ۰٪")).toBeInTheDocument();
  expect(screen.queryByText(/تطابق هنوز/)).not.toBeInTheDocument();
});

it("recovers from an API failure using retry", async () => {
  const user = userEvent.setup();
  (apiClient.get as jest.Mock)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ data: emptyDashboard });
  render(<DashboardView />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "دریافت داشبورد انجام نشد.",
  );
  await user.click(screen.getByRole("button", { name: "تلاش دوباره" }));
  expect(
    await screen.findByRole("link", { name: "تکمیل پروفایل" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledTimes(2);
});
