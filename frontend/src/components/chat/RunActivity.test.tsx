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
it.each([5, 10])(
  "keeps the server's %i-job target visible as source work progresses",
  (count) => {
    const run = view();
    run.events = [
      {
        id: "start",
        sequence: 1,
        runId: "run",
        timestamp: "now",
        type: "agent.started",
        data: { searchMode: "adaptive", targetValidJobs: count },
      },
      {
        id: "source",
        sequence: 2,
        runId: "run",
        timestamp: "now",
        type: "source.started",
        data: { source: "jobinja.ir" },
      },
    ];
    render(<RunActivity run={run} />);
    expect(
      screen.getByText(
        `هدف جستجو: ${count.toLocaleString("fa-IR")} آگهی با شرایط تأییدشده`,
      ),
    ).toBeInTheDocument();
  },
);
it("shows source extraction progress and keeps categorized failures visible when collapsed", () => {
  const run = view();
  run.sources = [
    { source: "jobvision.ir", found: 2, accepted: 0, rejected: 0 },
  ];
  run.events = [
    {
      id: "progress",
      runId: "run",
      sequence: 1,
      timestamp: "now",
      type: "source.progress",
      data: { source: "jobvision.ir", stage: "extract" },
    },
  ];
  const { rerender } = render(<RunActivity run={run} />);
  expect(
    screen.getByRole("button", { name: /جاب‌ویژن: در حال استخراج/ }),
  ).toBeInTheDocument();
  rerender(
    <RunActivity
      run={{
        ...run,
        status: "PARTIAL",
        sources: [
          {
            source: "irantalent.com",
            found: 1,
            accepted: 0,
            rejected: 1,
            error: "SOURCE_UNAVAILABLE",
            issue: {
              category: "provider",
              message: "سرویس دریافت پاسخ معتبر نداد.",
              retryable: true,
            },
          },
        ],
      }}
    />,
  );
  expect(screen.getByLabelText("مشکلات بررسی منابع")).toHaveTextContent(
    /ایران‌تلنت.*خطای سرویس/,
  );
  expect(screen.getByRole("button", { name: /مشاهده جزئیات/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
it("does not present incomplete searches with zero jobs as a successful empty search", () => {
  render(<RunActivity run={{ ...view(), status: "PARTIAL" }} />);
  expect(
    screen.getByRole("button", {
      name: /جستجو کامل نشد؛ هنوز نتیجه‌ای تأیید نشده/,
    }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/✓ ۰ موقعیت پیدا شد/)).not.toBeInTheDocument();
});
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
  expect(screen.getAllByText(/در حال جستجو/).length).toBeGreaterThan(0);
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
