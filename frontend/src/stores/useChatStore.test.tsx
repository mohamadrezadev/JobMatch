import { useChatStore } from "./useChatStore";
import apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const context = {
  searchContext: { targetRoles: ["Backend Developer"] },
  candidateFacts: { skills: [], deniedSkills: [], statements: [] },
};
const conversation = {
  id: "c",
  updatedAt: "2026-10-05T00:00:00Z",
  context,
  messages: [],
};
describe("Chat client state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.getState().reset("owner");
  });
  it("loads owned history and context", async () => {
    get.mockResolvedValue({ data: { data: conversation } });
    await useChatStore.getState().select("c");
    expect(useChatStore.getState().active).toEqual(conversation);
    expect(useChatStore.getState().pending).toBe(false);
  });
  it("reports failed sends so the caller preserves its draft", async () => {
    post.mockRejectedValue(new Error("offline"));
    expect(await useChatStore.getState().send("Backend")).toBe(false);
    expect(useChatStore.getState().error).toBeTruthy();
    expect(useChatStore.getState().active).toBeNull();
  });
  it("does not duplicate a committed turn when history refresh fails", async () => {
    post.mockResolvedValue({
      data: { data: { conversationId: "c", message: "ready", ...context } },
    });
    get.mockRejectedValue(new Error("offline"));
    expect(await useChatStore.getState().send("Backend")).toBe(true);
    expect(
      useChatStore.getState().active?.messages.map((m) => m.content),
    ).toEqual(["Backend", "ready"]);
    expect(useChatStore.getState().error).toContain("ذخیره شد");
  });
  it("ignores responses from a previous authenticated owner", async () => {
    let finish!: (value: unknown) => void;
    get.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const request = useChatStore.getState().select("c");
    useChatStore.getState().reset("another-owner");
    finish({ data: { data: conversation } });
    await request;
    expect(useChatStore.getState().active).toBeNull();
    expect(useChatStore.getState().owner).toBe("another-owner");
  });
  it("blocks overlapping sends and switching while a request is pending", async () => {
    let finish!: (value: unknown) => void;
    post.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    get.mockResolvedValue({ data: { data: conversation } });
    const first = useChatStore.getState().send("Backend");
    expect(await useChatStore.getState().send("React")).toBe(false);
    await useChatStore.getState().select("other");
    expect(get).not.toHaveBeenCalled();
    finish({
      data: { data: { conversationId: "c", message: "ready", ...context } },
    });
    await first;
    expect(post).toHaveBeenCalledTimes(1);
  });
  it("does not request data while signed out", async () => {
    useChatStore.getState().reset(null);
    await useChatStore.getState().loadList();
    expect(await useChatStore.getState().send("Backend")).toBe(false);
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});
