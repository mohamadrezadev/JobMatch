"use client";
import Link from "next/link";
import { useState } from "react";
import { useChatRunStore } from "@/stores/useChatRunStore";
import { runFinished, type ChatRunView } from "@/types/chat-run";
import type { Conversation } from "@/types/chat";
import {
  progressLabel,
  stageLabels,
  sourceNames,
  discoveryTargetLabel,
} from "@/lib/discovery-progress";
import { SourceProblems } from "./SourceProblems";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { TaskProgress } from "./TaskProgress";

const agentReasons: Record<string, string> = {
  INITIAL_SEARCH: "شروع جستجو در منابع منتخب",
  TOO_FEW_RESULTS: "نتایج قابل‌تأیید کافی نیست؛ جستجو ادامه پیدا می‌کند.",
  SOURCE_FAILURE_RECOVERY:
    "یکی از منابع پاسخ کامل نداد؛ منابع دیگری بررسی می‌شوند.",
  ENOUGH_RESULTS: "تعداد کافی فرصت قابل‌تأیید پیدا شد.",
  SOURCES_EXHAUSTED: "همه منابع در دسترس بررسی شدند.",
  STEP_LIMIT: "جستجو به سقف چهار مرحله رسید؛ نتایج موجود حفظ شدند.",
  TIME_LIMIT: "زمان جستجو تمام شد؛ نتایج موجود حفظ شدند.",
};

export function RunActivity({ run }: { run: ChatRunView }) {
  const [expanded, setExpanded] = useState(false);
  const { pending, start } = useChatRunStore();
  const finished = runFinished(run.status);
  const context = run.events.find((e) => e.type === "context.updated")?.data
    .conversation as Conversation | undefined;
  const cached = run.events.some((e) => e.type === "search.cached");
  const searching = run.events.some((e) => e.type === "search.started");
  const showDetails = !finished || expanded;
  const current = [...run.events]
    .reverse()
    .find((event) => /^(context|source|agent|search)\./.test(event.type));
  return (
    <section
      aria-label="فعالیت اجرای درخواست"
      className="mr-auto max-w-[90%] space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-dark-border dark:bg-dark-card"
    >
      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
        فعالیت دستیار کارمچ
      </p>
      <button
        type="button"
        aria-expanded={showDetails}
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-2 text-right text-xs font-semibold text-brand-600 dark:text-brand-200"
      >
        {!finished && <LoadingSpinner className="h-4 w-4" />}
        {run.status === "FAILED"
          ? "! عملیات کامل نشد"
          : run.status === "PARTIAL"
            ? run.jobs.length
              ? `! ${run.jobs.length.toLocaleString("fa-IR")} موقعیت پیدا شد؛ بررسی منابع کامل نشد`
              : "! جستجو کامل نشد؛ هنوز نتیجه‌ای تأیید نشده"
            : finished
              ? `✓ ${searching || cached ? `${run.jobs.length.toLocaleString("fa-IR")} موقعیت پیدا شد` : "درخواست بررسی شد"}`
              : `◌ ${progressLabel(current)}`}
        {finished && (
          <span className="mr-2 font-normal">
            {expanded ? "بستن جزئیات" : "مشاهده جزئیات"}
          </span>
        )}
      </button>
      {showDetails && (
        <div
          aria-live="polite"
          aria-atomic="false"
          className="space-y-2 text-xs text-slate-600 dark:text-slate-300"
        >
          <TaskProgress events={run.events} finished={finished} sources={run.sources} />
          {context ? (
            <p>
              ✓ درخواست مشخص شد:{" "}
              {[
                ...context.context.searchContext.targetRoles,
                ...(context.context.searchContext.requestedCount
                  ? [
                      `${context.context.searchContext.requestedCount.toLocaleString("fa-IR")} فرصت درخواستی`,
                    ]
                  : []),
                ...(context.context.searchContext.requiredSkills ?? []),
                ...(context.context.searchContext.preferredSkills ?? []),
                ...(context.context.searchContext.workTypes ?? []).map(
                  (work) =>
                    ({ Remote: "دورکار", Hybrid: "هیبرید", OnSite: "حضوری" })[
                      work
                    ],
                ),
                ...(context.context.searchContext.locations ?? []),
                ...(context.context.searchContext.experienceLevel
                  ? [context.context.searchContext.experienceLevel]
                  : []),
                ...(context.context.searchContext.minimumSalary
                  ? [
                      `حداقل ${context.context.searchContext.minimumSalary.toLocaleString("fa-IR")} تومان`,
                    ]
                  : []),
              ].join(" · ") || "اطلاعات گفتگو به‌روزرسانی شد"}
            </p>
          ) : run.events.some((e) => e.type === "context.processing") ? (
            <p>◌ در حال بررسی درخواست</p>
          ) : (
            <p>○ درخواست پذیرفته شد</p>
          )}
          {cached && <p>✓ نتایج ذخیره‌شده همین ترجیحات بازیابی شد</p>}
          {run.events
            .filter((event) => event.type.startsWith("agent."))
            .filter((event, index, all) => !all.slice(index + 1).some(item => item.type === event.type))
            .map((event) => {
              const data = event.data;
              if (
                event.type === "agent.started" &&
                (discoveryTargetLabel(data.targetValidJobs) ||
                  (data.searchMode === "parallel" &&
                    Array.isArray(data.sources)))
              )
                return (
                  <div key={event.id}>
                    {discoveryTargetLabel(data.targetValidJobs) && (
                      <p>{discoveryTargetLabel(data.targetValidJobs)}</p>
                    )}
                    {data.searchMode === "parallel" &&
                      Array.isArray(data.sources) && (
                        <p>
                          ◌ جستجوی همزمان در{" "}
                          {data.sources.length.toLocaleString("fa-IR")} منبع
                        </p>
                      )}
                  </div>
                );
              if (event.type === "agent.planning")
                return (
                  <p key={event.id}>
                    ◌ برنامه‌ریزی جستجو · مرحله{" "}
                    {Number(data.step).toLocaleString("fa-IR")}
                  </p>
                );
              if (event.type === "agent.decision")
                return (
                  <p key={event.id}>
                    {agentReasons[String(data.reasonCode)] ??
                      "بررسی مرحله بعدی جستجو"}
                    {data.action === "SEARCH_SOURCES" &&
                      Array.isArray(data.sources) && (
                        <span dir="ltr">
                          {" "}
                          ·{" "}
                          {data.sources
                            .filter((source) => typeof source === "string")
                            .join("، ")}
                        </span>
                      )}
                  </p>
                );
              if (event.type === "agent.observation")
                return (
                  <p key={event.id}>
                    ✓ {Number(data.totalValidJobs).toLocaleString("fa-IR")}{" "}
                    نتیجه قابل‌تأیید ·{" "}
                    {Number(data.uncertainJobCount ?? 0).toLocaleString(
                      "fa-IR",
                    )}{" "}
                    نتیجه با حقوق تأییدنشده
                  </p>
                );
              if (event.type === "agent.completed")
                return <p key={event.id}>✓ بررسی منابع پایان یافت</p>;
              return null;
            })}
          {run.sources.map((source) => {
            const last = [...run.events]
              .reverse()
              .find((e) => e.data.source === source.source);
            const running =
              !finished &&
              ["source.started", "source.progress"].includes(last?.type ?? "");
            return (
              <p
                key={source.source}
                className="flex flex-wrap items-center gap-1.5"
              >
                {running && (
                  <LoadingSpinner className="h-3 w-3 text-brand-500" />
                )}
                <span>{sourceNames[source.source] ?? source.source}</span> —{" "}
                {running
                  ? `◌ ${last?.type === "source.progress" ? (stageLabels[String(last.data.stage)] ?? "در حال بررسی آگهی‌ها") : "در حال جستجو"}`
                  : source.error
                    ? `! بررسی کامل نشد · ${source.accepted.toLocaleString("fa-IR")} نتیجه`
                    : `✓ ${source.accepted.toLocaleString("fa-IR")} نتیجه · ${source.found.toLocaleString("fa-IR")} لینک پیدا شد`}
              </p>
            );
          })}
          {run.status === "PARTIAL" && (
            <p>! بعضی منابع کامل بررسی نشدند؛ نتایج موجود حفظ شده‌اند.</p>
          )}
        </div>
      )}
      <SourceProblems sources={run.sources} />
      {run.error && (
        <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">
          {run.error}
        </p>
      )}
      {run.retryable && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void start("", undefined, run.runId)}
          className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-500 disabled:opacity-40"
        >
          تلاش دوباره
        </button>
      )}
      {run.jobs.length > 0 && (
        <div
          aria-label="فرصت‌های پیدا شده"
          className="flex gap-3 overflow-x-auto pb-2"
        >
          {run.jobs.map((job) => (
            <article
              key={job.id}
              className="w-60 shrink-0 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-dark-border dark:bg-dark-surface"
            >
              <h3 className="font-bold">{job.title}</h3>
              <p>{job.company}</p>
              <p>
                {job.location ?? "شهر اعلام نشده"} ·{" "}
                {job.workType
                  ? { Remote: "دورکار", Hybrid: "هیبرید", OnSite: "حضوری" }[
                      job.workType
                    ]
                  : "نوع حضور اعلام نشده"}
              </p>
              <p className="text-brand-500">
                {job.salaryMin != null || job.salaryMax != null
                  ? `${[job.salaryMin, job.salaryMax]
                      .filter((value) => value != null)
                      .map((value) => value!.toLocaleString("fa-IR"))
                      .join(
                        " تا ",
                      )} ${job.currency === "TOMAN" ? "تومان" : "واحد اعلام نشده"}${job.salaryPeriod === "MONTHLY" ? " در ماه" : ""}`
                  : "حقوق اعلام نشده"}
              </p>
              {job.warnings.map((warning) => (
                <p key={warning} className="text-amber-600 dark:text-amber-400">
                  {warning}
                </p>
              ))}
              {context?.context.searchContext.minimumSalary != null &&
                (job.salaryMin == null ||
                  job.currency !== "TOMAN" ||
                  job.salaryPeriod !== "MONTHLY") && (
                  <p className="text-amber-600 dark:text-amber-400">
                    حداقل حقوق درخواستی تأیید نشده؛ این فرصت جزو نتایج کافی حساب
                    نمی‌شود.
                  </p>
                )}
              <div className="flex gap-3">
                <Link href={`/jobs/${job.id}`} className="text-brand-500">
                  جزئیات
                </Link>
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  آگهی اصلی
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
