"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDiscoveryStore } from "@/stores/useDiscoveryStore";
import { Icon } from "@/components/pathly/Icon";
import type { SearchContext } from "@/types/chat";
import { SourceProblems } from "./SourceProblems";

export function DiscoveryPanel({
  conversationId,
  context,
  trigger,
}: {
  conversationId: string;
  context: SearchContext;
  trigger: number;
}) {
  const owner = useAuthStore((state) => state.user?.id);
  const discovery = useDiscoveryStore();
  // PostgreSQL JSONB may reorder keys when committed history replaces the optimistic turn.
  const key = `${owner}:${conversationId}:${JSON.stringify(context, Object.keys(context).sort())}:${trigger}`;
  useEffect(() => {
    void useDiscoveryStore
      .getState()
      .activate(key, conversationId, trigger > 0);
  }, [key, conversationId, trigger]);
  if (discovery.key !== key) return null;
  const result = discovery.result;
  return (
    <section
      aria-label="نتایج جستجوی آگهی"
      className="max-h-[45%] shrink-0 overflow-y-auto border-t border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-dark-border dark:bg-dark-card/30"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold">فرصت‌های واقعی از منابع ایرانی</h2>
        <button
          type="button"
          onClick={() => void discovery.search()}
          disabled={discovery.pending}
          className="rounded-lg bg-brand-500/10 px-3 py-2 text-[10px] font-bold text-brand-500 disabled:opacity-40"
        >
          <Icon name="magnifying-glass" className="ml-1" />
          {discovery.pending
            ? "در حال جستجو…"
            : result
              ? "بررسی دوباره"
              : "جستجوی فرصت‌ها"}
        </button>
      </div>
      {discovery.pending && (
        <p role="status" className="text-xs text-brand-500">
          در حال بررسی آگهی‌ها در سایت‌های کاریابی ایرانی…
        </p>
      )}
      {discovery.error && (
        <p
          role="alert"
          className="text-xs leading-6 text-amber-600 dark:text-amber-400"
        >
          {discovery.error}
        </p>
      )}
      {result && (
        <>
          <SourceProblems sources={result.sources} />
          <p
            role="status"
            className="mb-3 text-xs text-slate-500 dark:text-slate-400"
          >
            {result.jobs.length
              ? `${result.jobs.length.toLocaleString("fa-IR")} موقعیت مرتبط پیدا شد.`
              : "آگهی معتبری با شرایط فعلی پیدا نشد."}
            {result.partial &&
              " بعضی منابع در دسترس نبودند؛ نتایج موجود نمایش داده شده‌اند."}
          </p>
          <div className="flex max-h-64 gap-3 overflow-x-auto pb-2">
            {result.jobs.map((job) => (
              <article
                key={job.id}
                className="w-64 shrink-0 rounded-xl border border-slate-200 bg-white p-4 text-xs dark:border-dark-border dark:bg-dark-surface"
              >
                <h3 className="font-bold">{job.title}</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  {job.company}
                </p>
                <p className="mt-2 text-[10px] text-slate-500">
                  {job.location ?? "شهر اعلام نشده"} ·{" "}
                  {job.workType
                    ? { Remote: "دورکار", Hybrid: "هیبرید", OnSite: "حضوری" }[
                        job.workType
                      ]
                    : "نوع حضور اعلام نشده"}
                </p>
                <p className="mt-3 font-semibold text-brand-500">
                  {job.salaryMin != null || job.salaryMax != null
                    ? `${[job.salaryMin, job.salaryMax]
                        .filter((value) => value != null)
                        .map((value) => value!.toLocaleString("fa-IR"))
                        .join(
                          " تا ",
                        )} ${job.currency === "TOMAN" ? "تومان" : "(واحد اعلام نشده)"}${job.salaryPeriod === "MONTHLY" ? " در ماه" : ""}`
                    : "حقوق در آگهی اعلام نشده"}
                </p>
                {job.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="mt-1 text-[10px] text-amber-600 dark:text-amber-400"
                  >
                    {warning}
                  </p>
                ))}
                <p
                  dir="ltr"
                  className="mt-3 text-right text-[10px] text-slate-400"
                >
                  {job.source}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-bold text-brand-500"
                  >
                    مشاهده جزئیات
                  </Link>
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 dark:text-slate-300"
                  >
                    آگهی اصلی <Icon name="arrow-up-right-from-square" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
