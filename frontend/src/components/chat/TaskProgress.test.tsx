import { render, screen, within } from "@testing-library/react";
import { TaskProgress } from "./TaskProgress";
it("keeps parallel source phases independent and identifies a known failed stage", () => {
  render(
    <TaskProgress
      finished={false}
      events={[
        { type: "context.updated", data: {} },
        { type: "source.started", data: { source: "jobvision.ir" } },
        {
          type: "source.progress",
          data: { source: "jobvision.ir", stage: "extract" },
        },
        { type: "source.started", data: { source: "jobinja.ir" } },
        {
          type: "source.progress",
          data: { source: "jobinja.ir", stage: "fetch" },
        },
        {
          type: "source.failed",
          data: {
            source: "jobvision.ir",
            issue: {
              category: "timeout",
              stage: "extract",
              message: "timeout",
              retryable: true,
            },
          },
        },
      ]}
    />,
  );
  expect(
    within(screen.getByLabelText("مراحل جاب‌ویژن")).getByText(
      /تکمیل نشد در مرحله «استخراج اطلاعات»/,
    ),
  ).toBeInTheDocument();
  expect(
    within(screen.getByLabelText("مراحل جابینجا")).getByRole("status"),
  ).toHaveTextContent("دریافت صفحات در حال انجام است");
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
it("does not invent the stage of an ambiguous timeout or a cached fetch", () => {
  const { rerender } = render(
    <TaskProgress
      finished={true}
      events={[]}
      sources={[
        {
          source: "irantalent.com",
          failed: true,
          issue: { category: "timeout", message: "unknown", retryable: true },
        },
      ]}
    />,
  );
  expect(screen.getByText("مرحله دقیق توقف مشخص نیست")).toBeInTheDocument();
  rerender(
    <TaskProgress
      finished={true}
      events={[{ type: "search.cached", data: {} }]}
    />,
  );
  expect(
    screen.getAllByText("نیاز نبود؛ نتیجه ذخیره‌شده").length,
  ).toBeGreaterThan(0);
});
