import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
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
});
