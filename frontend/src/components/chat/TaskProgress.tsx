import { LoadingSpinner } from "@/components/ui/LoadingState";
import { sourceNames } from "@/lib/discovery-progress";
import type { DiscoveryIssue } from "@/types/discovery";

type Event = { type: string; data: Record<string, unknown> };
export const taskStageNames: Record<string, string> = {
  context: "فهم درخواست",
  search: "جستجوی لینک‌ها",
  fetch: "دریافت صفحات",
  extract: "استخراج اطلاعات",
  filter: "تطبیق شرایط",
  save: "آماده‌سازی نتیجه",
  validate: "بررسی اعتبار لینک",
};
function stageOf(event: Event) {
  if (event.type.startsWith("context.")) return "context";
  if (event.type === "source.progress") return String(event.data.stage);
  if (
    [
      "agent.started",
      "agent.planning",
      "source.started",
      "search.started",
    ].includes(event.type)
  )
    return "search";
  if (
    [
      "results.saving",
      "search.completed",
      "search.cached",
      "assistant.completed",
    ].includes(event.type)
  )
    return "save";
  if (event.type === "job.accepted") return "filter";
  return undefined;
}
export function TaskProgress({
  events,
  finished,
  sources = [],
}: {
  events: Event[];
  finished: boolean;
  sources?: Array<{
    source: string;
    failed?: boolean;
    error?: string;
    accepted?: number;
    issue?: DiscoveryIssue;
  }>;
}) {
  const observed = new Set(events.map(stageOf).filter(Boolean));
  const search =
    observed.has("search") || events.some((e) => e.type === "search.cached");
  const stages =
    search || !finished
      ? ["context", "search", "fetch", "extract", "filter", "save"]
      : ["context", "save"];
  const current = [...events].reverse().map(stageOf).find(Boolean) ?? "context";
  const contextDone = events.some((e) => e.type === "context.updated");
  const cached = events.some((e) => e.type === "search.cached");
  const sourceIds = [
    ...new Set([
      ...sources.map((s) => s.source),
      ...events
        .filter(
          (e) =>
            e.type.startsWith("source.") && typeof e.data.source === "string",
        )
        .map((e) => String(e.data.source)),
    ]),
  ];
  return (
    <div aria-label="مراحل درخواست" className="space-y-3">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stages.map((stage) => {
          const seen =
            observed.has(stage) || (stage === "context" && contextDone);
          const running = !finished && stage === current;
          const label = running
            ? "در حال انجام"
            : stage === "context" && contextDone
              ? "انجام شد"
              : seen
                ? finished
                  ? "اجرا شد"
                  : "شروع شده"
                : finished
                  ? cached
                    ? "نیاز نبود؛ نتیجه ذخیره‌شده"
                    : "اجرا ثبت نشد"
                  : "در انتظار";
          return (
            <li
              key={stage}
              aria-current={running ? "step" : undefined}
              className={`rounded-xl border p-2 ${running ? "border-brand-500/40 bg-brand-500/10 text-brand-600 dark:text-brand-200" : "border-slate-200 dark:border-dark-border"}`}
            >
              <span className="flex items-center gap-1.5 font-semibold">
                {running ? (
                  <LoadingSpinner className="h-3 w-3" />
                ) : (
                  <span aria-hidden>{seen ? "✓" : "○"}</span>
                )}
                {taskStageNames[stage]}
              </span>
              <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {sourceIds.length > 0 && (
        <p className="text-[10px] text-slate-500">
          منابع هم‌زمان بررسی می‌شوند؛ مرحله هر منبع می‌تواند متفاوت باشد.
        </p>
      )}
      {sourceIds.map((source) => {
        const history = events.filter(
          (e) => e.data.source === source && e.type.startsWith("source."),
        );
        const last = history[history.length - 1];
        const report = sources.find((s) => s.source === source);
        const issue =
          report?.issue ?? (last?.data.issue as DiscoveryIssue | undefined);
        const failed = !!(
          report?.failed ||
          report?.error ||
          issue ||
          last?.type === "source.failed"
        );
        const ended =
          finished ||
          ["source.completed", "source.failed"].includes(last?.type ?? "");
        const seen = [
          ...new Set(
            history
              .map((e) =>
                e.type === "source.started"
                  ? "search"
                  : e.type === "source.progress"
                    ? String(e.data.stage)
                    : undefined,
              )
              .filter((s): s is string => !!s),
          ),
        ];
        const currentStage =
          last?.type === "source.progress" ? String(last.data.stage) : "search";
        return (
          <div
            key={source}
            aria-label={`مراحل ${sourceNames[source] ?? source}`}
            className="rounded-xl border border-slate-200 p-3 dark:border-dark-border"
          >
            <div className="flex flex-wrap justify-between gap-2 font-semibold">
              <span>{sourceNames[source] ?? source}</span>
              <span>
                {ended
                  ? failed
                    ? "بررسی کامل نشد"
                    : "بررسی تمام شد"
                  : "در حال بررسی"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {seen.map((stage) => (
                <span
                  key={stage}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] dark:bg-dark-surface"
                >
                  {!ended && stage === currentStage ? "◌ " : "• "}
                  {taskStageNames[stage] ?? "بررسی آگهی"}
                </span>
              ))}
            </div>
            {!ended && (
              <p role="status" className="mt-2">
                {taskStageNames[currentStage] ?? "بررسی آگهی"} در حال انجام است
              </p>
            )}
            {failed && (
              <p className="mt-2 text-amber-700 dark:text-amber-300">
                {issue?.stage
                  ? `تکمیل نشد در مرحله «${taskStageNames[issue.stage]}»`
                  : "مرحله دقیق توقف مشخص نیست"}
              </p>
            )}
            {report?.accepted !== undefined && (
              <p className="mt-2">
                {report.accepted.toLocaleString("fa-IR")} آگهی تأیید شد
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
