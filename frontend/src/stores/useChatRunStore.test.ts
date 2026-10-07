import { useChatRunStore } from "./useChatRunStore";
import { useChatStore } from "./useChatStore";
import apiClient from "@/lib/api-client";
import { readRunStream } from "@/lib/chat-run-stream";
import type { ChatRunView, RunEvent } from "@/types/chat-run";
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));
jest.mock("@/lib/chat-run-stream", () => ({ readRunStream: jest.fn() }));
const post = apiClient.post as jest.Mock,
  get = apiClient.get as jest.Mock;
const run = (): ChatRunView => ({
  runId: "run",
  conversationId: "c",
  message: "Backend",
  userMessageId: "u",
  assistantMessageId: "a",
  status: "RUNNING",
  events: [],
  sequence: 0,
  jobs: [],
  sources: [],
  retryable: false,
  error: null,
});
const event = (
  sequence: number,
  type: string,
  data: Record<string, unknown> = {},
): RunEvent => ({
  id: `e${sequence}`,
  runId: "run",
  sequence,
  type,
  timestamp: "now",
  data,
});
beforeEach(() => {
  jest.clearAllMocks();
  useChatStore.getState().reset("owner");
  useChatRunStore.getState().reset();
  (readRunStream as jest.Mock).mockImplementation(
    (_id, _after, signal) =>
      new Promise<void>((resolve) =>
        signal.addEventListener("abort", resolve, { once: true }),
      ),
  );
});
afterEach(() => useChatRunStore.getState().reset());
it("retains source counts during phase updates and failure explanations on final replay", () => {
  useChatRunStore.setState({ runs: [run()] });
  const store = useChatRunStore.getState();
  store.receive(
    event(1, "source.completed", {
      source: "jobvision.ir",
      found: 4,
      accepted: 1,
      rejected: 3,
    }),
  );
  store.receive(
    event(2, "source.progress", { source: "jobvision.ir", stage: "extract" }),
  );
  expect(useChatRunStore.getState().runs[0].sources[0]).toMatchObject({
    found: 4,
    accepted: 1,
    rejected: 3,
  });
  const source = {
    source: "irantalent.com",
    found: 1,
    accepted: 0,
    rejected: 1,
    failed: true,
    issue: { category: "timeout", message: "Timed out", retryable: true },
  };
  store.receive(event(3, "search.completed", { jobs: [], sources: [source] }));
  expect(useChatRunStore.getState().runs[0].sources[0]).toMatchObject({
    error: "SOURCE_UNAVAILABLE",
    issue: source.issue,
  });
});
it("deduplicates replay and keeps results after failure", () => {
  useChatRunStore.setState({ runs: [run()], pending: true });
  const job = { id: "j", title: "Backend" };
  useChatRunStore.getState().receive(event(1, "job.accepted", { job }));
  useChatRunStore.getState().receive(event(1, "job.accepted", { job }));
  useChatRunStore
    .getState()
    .receive(event(2, "run.failed", { message: "failed", retryable: true }));
  expect(useChatRunStore.getState().runs[0]).toMatchObject({
    jobs: [job],
    sequence: 2,
    status: "FAILED",
    retryable: true,
  });
  expect(useChatRunStore.getState().pending).toBe(false);
});
it("does not discard a gap in event sequence", () => {
  useChatRunStore.setState({ runs: [run()] });
  expect(() =>
    useChatRunStore.getState().receive(event(2, "run.started")),
  ).toThrow("Missing run event");
  expect(useChatRunStore.getState().runs[0].sequence).toBe(0);
});
it("reuses the creation key when the POST response is lost", async () => {
  post.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({
    data: { data: { runId: "run", conversationId: "c" } },
  });
  expect(await useChatRunStore.getState().start("Backend", "c")).toBe(true);
  expect(post.mock.calls[0][1].requestId).toBe(post.mock.calls[1][1].requestId);
  expect(await useChatRunStore.getState().start("React", "c")).toBe(false);
});
it("preserves the uncertain creation key for a manual resend", async () => {
  post.mockRejectedValue(new Error("offline"));
  expect(await useChatRunStore.getState().start("Backend", "c")).toBe(false);
  const id = post.mock.calls[0][1].requestId;
  post.mockResolvedValue({
    data: { data: { runId: "run", conversationId: "c" } },
  });
  expect(await useChatRunStore.getState().start("Backend", "c")).toBe(true);
  expect(post.mock.calls[2][1].requestId).toBe(id);
});
it("ignores a late creation response after switching accounts", async () => {
  let resolve!: (value: unknown) => void;
  post.mockReturnValue(
    new Promise((finish) => {
      resolve = finish;
    }),
  );
  const creation = useChatRunStore.getState().start("Backend");
  useChatRunStore.getState().reset();
  useChatStore.getState().reset("other");
  resolve({ data: { data: { runId: "run", conversationId: "c" } } });
  expect(await creation).toBe(false);
  expect(useChatRunStore.getState().runs).toEqual([]);
  expect(readRunStream).not.toHaveBeenCalled();
});
it("restores activity without overwriting newer conversation history", async () => {
  const current = {
    id: "c",
    updatedAt: "now",
    context: {
      searchContext: { targetRoles: ["React"] },
      candidateFacts: { skills: [], deniedSkills: [], statements: [] },
    },
    messages: [
      {
        id: "new",
        role: "user",
        content: "React",
        sequence: 3,
        createdAt: "now",
      },
    ],
  };
  useChatStore.setState({ active: current });
  const stored = [
    event(1, "context.updated", {
      conversation: { ...current, messages: [] },
      userMessageId: "u",
      assistantMessageId: "a",
    }),
    event(2, "run.completed", {}),
  ];
  get.mockResolvedValue({
    data: {
      data: [
        { id: "run", conversationId: "c", message: "Backend", events: stored },
      ],
    },
  });
  await useChatRunStore.getState().restore("c");
  expect(useChatStore.getState().active).toEqual(current);
  expect(useChatRunStore.getState().runs[0].status).toBe("COMPLETED");
  expect(readRunStream).not.toHaveBeenCalled();
});
