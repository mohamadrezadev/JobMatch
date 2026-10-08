"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Job, MatchResult } from "@/types/job";
import {
  demoJobs,
  toPathlyJob,
  unwrap,
  type PathlyJob,
} from "@/lib/pathly-data";
import { Icon } from "./Icon";
import { DemoNotice } from "./DemoNotice";
import { recordEvent } from "@/lib/analytics";
import {
  JobFilters,
  emptyOpportunityFilters,
  type OpportunityFilters,
} from "./JobFilters";
import { JobsPagination } from "./JobsPagination";
import { LoadingState, ContentSkeleton } from "@/components/ui/LoadingState";

export function JobsView({ initialJobId }: { initialJobId?: string }) {
  const detailsRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user } = useAuthStore();
  const preview =
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "design";
  const [jobs, setJobs] = useState<PathlyJob[]>([]);
  const [selectedId, setSelectedId] = useState(initialJobId ?? "");
  const [filters, setFilters] = useState<OpportunityFilters>({
    ...emptyOpportunityFilters,
    ...(preview && !isAuthenticated
      ? { level: "Junior", role: "Frontend" }
      : {}),
  });
  const {
    query,
    city: cityFilter,
    workType: workFilter,
    level: levelFilter,
    role: targetRole,
    skills: skillFilter,
    minimumSalary,
  } = filters;
  const listRef = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState<number | undefined>();
  const [loadedPage, setLoadedPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(preview);
  const [reload, setReload] = useState(0);
  const [matches, setMatches] = useState<Record<string, MatchResult>>({});
  const [matchingId, setMatchingId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [reason, setReason] = useState("Technology");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  function applyFilters(next: OpportunityFilters) {
    setFilters(next);
    setPage(1);
  }
  useEffect(() => {
    let alive = true;
    setMatches({});
    if (!isAuthenticated) {
      setJobs(preview ? demoJobs : []);
      setDemo(preview);
      setSelectedId(preview ? demoJobs[0].id : "");
      return;
    }
    setDemo(false);
    setLoading(true);
    setError("");
    async function load() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        });
        if (query) params.set("q", query);
        if (minimumSalary) params.set("minimumSalary", minimumSalary);
        if (skillFilter) params.set("skills", skillFilter);
        if (targetRole) params.set("role", targetRole);
        if (cityFilter) params.set("location", cityFilter);
        if (workFilter) params.set("workType", workFilter);
        if (levelFilter) params.set("experienceLevel", levelFilter);
        const response = await apiClient.get<
          | { items: Job[]; pages?: number; total?: number }
          | {
              success: boolean;
              data: { items: Job[]; pages?: number; total?: number };
            }
        >(`/api/jobs/search?${params}`);
        const data = unwrap(response.data);
        const rows = data.items.map(toPathlyJob);
        if (alive) {
          setPages(data.pages ?? 0);
          setTotal(data.total);
          setLoadedPage(page);
          setMatches(
            Object.fromEntries(
              data.items
                .filter((job) => job.match)
                .map((job) => [job.id, job.match!]),
            ),
          );
        }
        if (initialJobId && !rows.some((row) => row.id === initialJobId)) {
          const detail = await apiClient.get<
            Job | { success: boolean; data: Job }
          >(`/api/jobs/${initialJobId}`);
          rows.unshift(toPathlyJob(unwrap(detail.data)));
        }
        if (alive) {
          setJobs(rows);
          setSelectedId(initialJobId ?? rows[0]?.id ?? "");
        }
      } catch {
        if (alive) setError("دریافت فرصت‌ها ممکن نشد. دوباره تلاش کنید.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [
    isAuthenticated,
    user?.id,
    initialJobId,
    reload,
    preview,
    query,
    page,
    minimumSalary,
    skillFilter,
    targetRole,
    cityFilter,
    workFilter,
    levelFilter,
  ]);
  const filtered = useMemo(
    () =>
      demo
        ? jobs.filter((job) => {
            const terms = [job.title, job.company, ...job.matchedSkills]
              .join(" ")
              .toLowerCase();
            return (
              terms.includes(query.toLowerCase()) &&
              (!cityFilter ||
                job.location.toLowerCase().includes(cityFilter.toLowerCase()) ||
                job.locationText.includes(cityFilter)) &&
              (!workFilter ||
                (workFilter === "Remote" && job.isRemote) ||
                (workFilter === "Hybrid" && job.isHybrid) ||
                (workFilter === "OnSite" && !job.isRemote && !job.isHybrid)) &&
              (!levelFilter ||
                (levelFilter === "Junior" &&
                  /junior|جونیور|کارآموز/i.test(job.title + job.type)) ||
                job.type === levelFilter) &&
              (!targetRole ||
                (targetRole === "Frontend"
                  ? /react|فرانت|frontend|front.end/i.test(terms)
                  : terms.includes(targetRole.toLowerCase()))) &&
              (!skillFilter ||
                skillFilter
                  .split(/[,،]/)
                  .every((skill) => terms.includes(skill.trim().toLowerCase())))
            );
          })
        : jobs,
    [
      jobs,
      query,
      cityFilter,
      workFilter,
      levelFilter,
      targetRole,
      skillFilter,
      demo,
    ],
  );
  const selected = filtered.find((job) => job.id === selectedId) ?? filtered[0];
  const selectedJobId = selected?.id;
  const selectedIsDemo = selected?.demo;
  const match = selected ? matches[selected.id] : undefined;
  useEffect(() => {
    setFeedbackNotice("");
    if (
      selectedJobId &&
      !selectedIsDemo &&
      isAuthenticated &&
      !loading &&
      !error
    )
      recordEvent("Job Viewed", selectedJobId);
  }, [selectedJobId, selectedIsDemo, isAuthenticated, loading, error]);
  async function feedback(rating: "Interested" | "NotInterested") {
    if (!selected || selected.demo) return;
    setFeedbackBusy(true);
    setFeedbackNotice("");
    try {
      await apiClient.post("/api/feedback", {
        jobId: selected.id,
        rating,
        ...(rating === "NotInterested" ? { reason } : {}),
      });
      setFeedbackNotice("بازخورد شما ذخیره شد.");
    } catch {
      setFeedbackNotice("ذخیره بازخورد انجام نشد. دوباره تلاش کنید.");
    } finally {
      setFeedbackBusy(false);
    }
  }
  useEffect(() => {
    if (
      !selectedJobId ||
      selectedIsDemo ||
      !isAuthenticated ||
      matches[selectedJobId] ||
      loading ||
      error
    ) {
      setMatchingId("");
      return;
    }
    let alive = true;
    const id = selectedJobId;
    setMatchingId(id);
    apiClient
      .post<MatchResult | { success: boolean; data: MatchResult }>(
        `/api/matching/${id}`,
      )
      .then((response) => {
        if (alive)
          setMatches((current) => ({
            ...current,
            [id]: unwrap(response.data),
          }));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setMatchingId("");
      });
    return () => {
      alive = false;
    };
  }, [selectedJobId, selectedIsDemo, isAuthenticated, matches, loading, error]);
  const score = match
    ? typeof match.matchScore === "number"
      ? match.matchScore
      : undefined
    : selected?.score;
  const analyzed = typeof score === "number";
  const matched =
    (analyzed ? match?.breakdown.skills.matched : undefined) ??
    selected?.matchedSkills ??
    [];
  const missing =
    (analyzed ? match?.breakdown.skills.missing : undefined) ?? [];
  const showDemo = () => {
    setJobs(demoJobs);
    setDemo(true);
    setSelectedId(demoJobs[0].id);
    applyFilters({
      ...emptyOpportunityFilters,
      level: "Junior",
      role: "Frontend",
    });
    setError("");
  };
  return (
    <section className="animate-fade-in space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">فرصت‌های شغلی</h1>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            آگهی‌ها را بررسی کن؛ تطابق شخصی پس از ساخت رزومه و براساس اطلاعات
            واقعی تو محاسبه می‌شود.
          </p>
        </div>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500/10 px-4 py-2.5 text-xs font-bold text-brand-500"
        >
          <Icon name="comments" /> جستجو با دستیار
        </Link>
      </header>
      <JobFilters value={filters} onApply={applyFilters} />
      {demo ? (
        <DemoNotice>
          آگهی‌ها و امتیازهای این نما همان نمونه‌های مرجع هستند.
        </DemoNotice>
      ) : (
        <p className="text-[10px] text-slate-400">
          فرصت‌های دریافت‌شده از KarMatch{" "}
          {process.env.NODE_ENV === "development" && (
            <button onClick={showDemo} className="mr-2 text-brand-500">
              مشاهده نمونه طراحی
            </button>
          )}
        </p>
      )}
      {demo && isAuthenticated && (
        <button
          onClick={() => setReload((current) => current + 1)}
          className="text-xs text-brand-500"
        >
          بازگشت به فرصت‌های واقعی
        </button>
      )}
      {loading && (
        <LoadingState
          title="در حال دریافت فرصت‌ها…"
          description="آگهی‌های مطابق فیلترهایت را دریافت می‌کنیم."
          compact
        />
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-500/10 p-4 text-xs text-rose-500"
        >
          {error}
          <button
            onClick={() => setReload((current) => current + 1)}
            className="mr-3 underline"
          >
            تلاش دوباره
          </button>
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div
          ref={listRef}
          tabIndex={-1}
          aria-label="نتایج فرصت‌ها"
          aria-busy={loading}
          className="space-y-3 scroll-mt-24 outline-none lg:col-span-7"
        >
          {!loading && !error && (
            <p
              role="status"
              className="text-xs text-slate-600 dark:text-slate-300"
            >
              {demo
                ? `${filtered.length.toLocaleString("fa-IR")} فرصت نمونه`
                : typeof total === "number"
                  ? `${total.toLocaleString("fa-IR")} فرصت پیدا شد`
                  : `${filtered.length.toLocaleString("fa-IR")} فرصت در این صفحه`}
            </p>
          )}
          {!loading && !error && !filtered.length && (
            <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-600">
              <p className="text-sm font-semibold">
                هیچ شغلی با این مشخصات یافت نشد.
              </p>
              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                فیلترها را کمتر کن یا با دستیار دنبال فرصت‌های تازه بگرد.
              </p>
              {Object.values(filters).some(Boolean) && (
                <button
                  onClick={() => applyFilters(emptyOpportunityFilters)}
                  className="min-h-11 rounded-xl bg-brand-500/10 px-4 text-xs font-bold text-brand-600 dark:text-brand-200"
                >
                  نمایش بدون فیلتر
                </button>
              )}
              <Link
                href="/chat"
                className="inline-flex min-h-11 items-center rounded-xl px-4 text-xs font-bold text-brand-600 dark:text-brand-200"
              >
                یافتن فرصت با دستیار
              </Link>
            </div>
          )}
          {loading && <ContentSkeleton layout="list" />}
          {!loading &&
            !error &&
            filtered.map((job) => (
              <button
                key={job.id}
                onClick={() => {
                  setSelectedId(job.id);
                  if (window.matchMedia?.("(max-width: 1023px)").matches)
                    requestAnimationFrame(() =>
                      detailsRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      }),
                    );
                }}
                aria-pressed={selected?.id === job.id}
                className={`interactive-hover w-full space-y-2 rounded-2xl border p-4 text-right transition-all ${selected?.id === job.id ? "border-brand-500 bg-brand-500/5" : "border-slate-200 bg-light-surface dark:border-dark-border dark:bg-dark-surface"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                      {job.title}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {job.company} • {job.locationText}
                    </p>
                  </div>
                  {job.score !== undefined && (
                    <span className="rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-500">
                      {job.score}٪
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {job.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-dark-card dark:text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.missingSkills.map((skill) => (
                    <span
                      key={`missing-${skill}`}
                      className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-600"
                    >
                      نیاز به {skill}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  {job.salary} {job.source ? `• ${job.source}` : ""}
                </p>
              </button>
            ))}
          {!demo && !error && (
            <JobsPagination
              page={loadedPage}
              pages={pages}
              loading={loading}
              onPage={(next) => {
                setPage(next);
                listRef.current?.scrollIntoView?.({
                  behavior: "smooth",
                  block: "start",
                });
                listRef.current?.focus({ preventScroll: true });
              }}
            />
          )}
        </div>
        <div
          ref={detailsRef}
          className="glass-card h-fit scroll-mt-24 rounded-3xl border border-slate-200 bg-light-surface p-5 dark:border-dark-border dark:bg-dark-surface sm:p-6 lg:sticky lg:top-24 lg:col-span-5"
        >
          {loading ? (
            <ContentSkeleton layout="detail" />
          ) : selected && !error ? (
            <div className="space-y-6">
              {matchingId === selected.id && (
                <LoadingState
                  title="در حال بررسی تطابق این فرصت…"
                  description="اطلاعات آگهی و رزومه‌ات را بررسی می‌کنیم."
                  compact
                />
              )}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-dark-border">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    {selected.title}
                  </h2>
                  <p className="text-xs font-medium text-slate-400">
                    {selected.company} • {selected.locationText}
                  </p>
                </div>
                {score !== undefined && (
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-emerald-500">
                    <span className="text-2xl font-black">
                      {Math.round(score)}٪
                    </span>
                    <span className="text-[10px] font-bold">تطابق با شما</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {selected.sourceUrl && (
                  <a
                    href={selected.sourceUrl}
                    onClick={() =>
                      recordEvent("Source Job Opened", selected.id)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-500"
                  >
                    مشاهده آگهی اصلی در {selected.source}{" "}
                    <Icon name="arrow-up-right-from-square" />
                  </a>
                )}
                <h3 className="text-xs font-bold uppercase text-slate-400">
                  شرح موقعیت شغلی
                </h3>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {selected.description}
                </p>
              </div>
              {match?.explanation && (
                <div className="rounded-2xl border border-brand-500/15 bg-brand-500/5 p-4">
                  <p className="text-xs leading-7">{match.explanation}</p>
                  {!analyzed && match.reason === "RESUME_REQUIRED" && (
                    <Link
                      href={`/resume?job=${selected.id}`}
                      className="mt-2 inline-flex text-xs font-bold text-brand-500"
                    >
                      ساخت رزومه برای محاسبه تطابق{" "}
                      <Icon name="arrow-left" className="mr-2" />
                    </Link>
                  )}
                  {match.status === "partial" && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      تحلیل براساس بخش‌های مشخص آگهی است؛ پوشش اطلاعات{" "}
                      {match.evidenceCoverage}٪.
                    </p>
                  )}
                </div>
              )}
              {!selected.demo && isAuthenticated && (
                <div className="space-y-3">
                  {feedbackBusy && (
                    <LoadingState title="در حال ذخیره بازخورد…" compact />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={feedbackBusy}
                      onClick={() => void feedback("Interested")}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-white"
                    >
                      علاقه‌مندم
                    </button>
                    <select
                      aria-label="دلیل عدم علاقه"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="rounded-xl border p-2 dark:bg-dark-card"
                    >
                      {[
                        ["Salary", "حقوق"],
                        ["Technology", "فناوری"],
                        ["Location", "مکان"],
                        ["JobType", "نوع همکاری"],
                        ["ExperienceLevel", "سطح تجربه"],
                        ["NotInterestedInCompany", "شرکت"],
                        ["Other", "سایر"],
                      ].map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={feedbackBusy}
                      onClick={() => void feedback("NotInterested")}
                      className="rounded-xl border px-4 py-2"
                    >
                      علاقه ندارم
                    </button>
                  </div>
                  {feedbackNotice && <p role="status">{feedbackNotice}</p>}
                </div>
              )}
              <div
                className={`grid grid-cols-1 gap-4 pt-2 ${selected.demo || analyzed ? "md:grid-cols-2" : ""}`}
              >
                <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                    <Icon name="circle-check" />
                    {selected.demo || analyzed
                      ? "مهارت‌های منطبق با شما"
                      : "مهارت‌های موردنیاز آگهی"}{" "}
                    ({matched.length})
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {matched.map((skill) => (
                      <span
                        key={skill}
                        className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                {(selected.demo || analyzed) && (
                  <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                      <Icon name="triangle-exclamation" />
                      شکاف مهارت (Skill Gap)
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {missing.map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-dark-border">
                <span className="text-xs text-slate-400">
                  محدوده حقوق: {selected.salary}
                </span>
                <Link
                  href={`/resume?job=${selected.id}`}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600"
                >
                  سفارشی‌سازی رزومه برای این شغل
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-12 text-center text-slate-400">
              <Icon name="hand-pointer" className="text-3xl" />
              <p className="text-xs">
                {loading
                  ? "در حال دریافت جزئیات فرصت‌ها…"
                  : "یک موقعیت شغلی را برای مشاهده جزئیات انتخاب کنید."}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
