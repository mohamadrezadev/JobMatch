import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { useDiscoveryStore } from "@/stores/useDiscoveryStore";
import apiClient from "@/lib/api-client";
jest.mock("@/stores/useAuthStore", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: "owner" } }),
}));
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
it("does not repeat discovery when JSONB history changes property ordering", async () => {
  useDiscoveryStore.getState().reset();
  (apiClient.post as jest.Mock).mockResolvedValue({
    data: { data: { runId: "run", jobs: [], partial: false, sources: [] } },
  });
  const view = render(
    <DiscoveryPanel
      conversationId="owned"
      trigger={1}
      context={{ targetRoles: ["Backend Developer"], workTypes: ["Remote"] }}
    />,
  );
  await screen.findByText("آگهی معتبری با شرایط فعلی پیدا نشد.");
  view.rerender(
    <DiscoveryPanel
      conversationId="owned"
      trigger={1}
      context={{ workTypes: ["Remote"], targetRoles: ["Backend Developer"] }}
    />,
  );
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
});
