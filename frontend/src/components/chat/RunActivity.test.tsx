import { fireEvent, render, screen } from "@testing-library/react";
import { RunActivity } from "./RunActivity";
import type { ChatRunView } from "@/types/chat-run";
import { useChatRunStore } from "@/stores/useChatRunStore";
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));
const view = (): ChatRunView => ({
  runId: "run",
  conversationId: "c",
  userMessageId: "u",
  assistantMessageId: "a",
  message: "Backend",
  status: "RUNNING",
  events: [],
  sequence: 0,
  jobs: [],
  sources: [],
  retryable: false,
  error: null,
});
beforeEach(() => useChatRunStore.getState().reset());
it("shows that all four sources are searched concurrently", () => {
  const run = view();
  run.events = [
    {
      id: "start",
      sequence: 1,
      runId: "run",
      timestamp: "now",
      type: "agent.started",
      data: {
        searchMode: "parallel",
        sources: [
          "jobinja.ir",
          "jobvision.ir",
          "irantalent.com",
          "e-estekhdam.com",
        ],
      },
    },
  ];
  render(<RunActivity run={run} />);
  expect(screen.getByText(/جستجوی همزمان در ۴ منبع/)).toBeInTheDocument();
});
it("shows the interpreted occupation and requested count before planning", () => {
  const run = view();
  run.events = [
    {
      id: "context",
      sequence: 1,
      runId: "run",
      timestamp: "now",
      type: "context.updated",
      data: {
        conversation: {
          context: {
            searchContext: { targetRoles: ["حسابداری"], requestedCount: 10 },
          },
        },
      },
    },
    {
      id: "plan",
      sequence: 2,
      runId: "run",
      timestamp: "now",
      type: "agent.planning",
      data: { step: 1 },
    },
  ];
  render(<RunActivity run={run} />);
  expect(
    screen.getByText(/درخواست مشخص شد:.*حسابداری.*۱۰ فرصت درخواستی/),
  ).toBeInTheDocument();
  expect(screen.getByText(/برنامه‌ریزی جستجو/)).toBeInTheDocument();
});
it("shows Persian agent summaries without rendering internal model reasoning", () => {
  const run = view();
  run.events = [
    {
      id: "e1",
      sequence: 1,
      runId: "run",
      timestamp: "now",
      type: "agent.planning",
      data: { step: 2 },
    },
    {
      id: "e2",
      sequence: 2,
      runId: "run",
      timestamp: "now",
      type: "agent.decision",
      data: {
        action: "SEARCH_SOURCES",
        sources: ["irantalent.com"],
        reasonCode: "TOO_FEW_RESULTS",
        reasoning: "INTERNAL_REASONING",
      },
    },
    {
      id: "e3",
      sequence: 3,
      runId: "run",
      timestamp: "now",
      type: "agent.observation",
      data: { totalValidJobs: 1, uncertainJobCount: 5 },
    },
  ];
  render(<RunActivity run={run} />);
  expect(screen.getByText(/برنامه‌ریزی جستجو/)).toBeInTheDocument();
  expect(screen.getByText(/نتایج قابل‌تأیید کافی نیست/)).toBeInTheDocument();
  expect(screen.getByText(/نتیجه با حقوق تأییدنشده/)).toBeInTheDocument();
  expect(screen.queryByText("INTERNAL_REASONING")).not.toBeInTheDocument();
});
it("shows actual progress and keeps job cards visible after collapsing completed activity", () => {
  const run = view();
  run.events = [
    {
      id: "e",
      sequence: 1,
      runId: "run",
      type: "source.started",
      timestamp: "now",
      data: { source: "jobinja.ir" },
    },
  ];
  run.sources = [{ source: "jobinja.ir", found: 0, accepted: 0, rejected: 0 }];
  run.jobs = [
    {
      id: "job",
      title: "Backend",
      company: "X",
      location: null,
      workType: "Remote",
      salaryMin: null,
      salaryMax: null,
      currency: null,
      salaryPeriod: null,
      source: "jobinja.ir",
      sourceUrl: "https://jobinja.ir/jobs/1",
      requiredSkills: [],
      preferredSkills: [],
      warnings: [],
    },
  ];
  const { rerender } = render(<RunActivity run={run} />);
  expect(screen.getByText(/در حال جستجو/)).toBeInTheDocument();
  rerender(<RunActivity run={{ ...run, status: "COMPLETED" }} />);
  expect(screen.queryByText(/در حال جستجو/)).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Backend" })).toBeInTheDocument();
  const details = screen.getByRole("button", { name: /مشاهده جزئیات/ });
  expect(details).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(details);
  expect(details).toHaveAttribute("aria-expanded", "true");
});
it("makes partial and full failures explicit without removing existing cards", () => {
  const { rerender } = render(
    <RunActivity run={{ ...view(), status: "PARTIAL" }} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /مشاهده جزئیات/ }));
  expect(screen.getByText(/بعضی منابع کامل بررسی نشدند/)).toBeInTheDocument();
  rerender(
    <RunActivity
      run={{
        ...view(),
        status: "FAILED",
        error: "گفتگو حفظ شده",
        retryable: true,
      }}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("گفتگو حفظ شده");
  expect(screen.getByRole("button", { name: "تلاش دوباره" })).toBeEnabled();
});
