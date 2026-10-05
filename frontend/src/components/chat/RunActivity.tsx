"use client";
import Link from "next/link";
import { useState } from "react";
import { useChatRunStore } from "@/stores/useChatRunStore";
import { runFinished, type ChatRunView } from "@/types/chat-run";
import type { Conversation } from "@/types/chat";

export function RunActivity({ run }: { run: ChatRunView }) {
  const [expanded, setExpanded] = useState(false);
  const { pending, start } = useChatRunStore();
  const finished = runFinished(run.status);
  const context = run.events.find((e) => e.type === "context.updated")?.data
    .conversation as Conversation | undefined;
  const cached = run.events.some((e) => e.type === "search.cached");
  const searching = run.events.some((e) => e.type === "search.started");
  const showDetails = !finished || expanded;
  return (
    <section
      aria-label="فعالیت اجرای درخواست"
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-dark-border dark:bg-dark-card"
    >
      <button
        type="button"
        aria-expanded={showDetails}
        onClick={() => setExpanded(!expanded)}
        className="text-right text-xs font-semibold text-brand-500"
      >
        {run.status === "FAILED"
          ? "! عملیات کامل نشد"
          : finished
            ? `✓ ${searching || cached ? `${run.jobs.length.toLocaleString("fa-IR")} موقعیت پیدا شد` : "درخواست بررسی شد"}`
            : "◌ در حال انجام درخواست…"}
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
          {context ? (
            <p>
              ✓ درخواست مشخص شد:{" "}
              {[
                ...context.context.searchContext.targetRoles,
                ...(context.context.searchContext.preferredSkills ?? []),
                ...(context.context.searchContext.workTypes ?? []).map(
                  (work) =>
                    ({ Remote: "دورکار", Hybrid: "هیبرید", OnSite: "حضوری" })[
                      work
                    ],
                ),
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
          {run.sources.map((source) => {
            const last = [...run.events]
              .reverse()
              .find((e) => e.data.source === source.source);
            const running = last?.type === "source.started";
            return (
              <p key={source.source}>
                <span dir="ltr">{source.source}</span> —{" "}
                {running
                  ? "◌ در حال جستجو"
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
