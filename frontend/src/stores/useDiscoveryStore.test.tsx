import { useDiscoveryStore } from "./useDiscoveryStore";
import apiClient from "@/lib/api-client";
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
const result = {
  runId: "run",
  jobs: [],
  partial: false,
  sources: [],
  code: "NO_JOBS_FOUND",
};
describe("Discovery client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useDiscoveryStore.getState().reset();
  });
  it("automatically searches once, even under repeated activation", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { data: result } });
    await Promise.all([
      useDiscoveryStore.getState().activate("key", "owned", true),
      useDiscoveryStore.getState().activate("key", "owned", true),
    ]);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/job-discovery/search",
      { conversationId: "owned" },
      { timeout: 70000 },
    );
    expect(useDiscoveryStore.getState().result).toEqual(result);
  });
  it("restores results without starting another search", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: result } });
    await useDiscoveryStore.getState().activate("history", "owned", false);
    expect(useDiscoveryStore.getState().result).toEqual(result);
    expect(apiClient.post).not.toHaveBeenCalled();
  });
  it("shows provider unavailability without fabricating jobs", async () => {
    (apiClient.post as jest.Mock).mockRejectedValue({
      response: {
        data: { error: { code: "JOB_SEARCH_PROVIDER_UNAVAILABLE" } },
      },
    });
    await useDiscoveryStore.getState().activate("key", "owned", true);
    expect(useDiscoveryStore.getState().error).toContain("هنوز فعال نشده");
    expect(useDiscoveryStore.getState().result).toBeNull();
  });
  it("ignores delayed results after switching owners or context", async () => {
    let finish!: (value: unknown) => void;
    (apiClient.post as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const request = useDiscoveryStore
      .getState()
      .activate("old-owner", "old", true);
    useDiscoveryStore.getState().reset();
    finish({ data: { data: result } });
    await request;
    expect(useDiscoveryStore.getState().result).toBeNull();
    expect(useDiscoveryStore.getState().pending).toBe(false);
  });
});
