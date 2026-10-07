"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { unwrap } from "@/lib/pathly-data";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Job } from "@/types/job";
import { Icon } from "./Icon";
import { PageLoading } from "@/components/ui/LoadingState";
interface DashboardData {
  profileCompletion: number;
  resumeCount: number;
  interestedCount: number;
  recommendations: Job[];
  interestedJobs: Job[];
  recentDiscoveries: { id: string; resultCount: number; status: string }[];
  recentConversations: { id: string; messages: { content: string }[] }[];
  recentActivity: { id: string; name: string; createdAt: string }[];
}
const labels: Record<string, string> = {
  "User Registered": "ثبت‌نام",
  "Onboarding Completed": "تکمیل پروفایل",
  "Chat Started": "شروع گفتگو",
  "Job Search Started": "شروع جستجو",
  "Job Search Completed": "پایان جستجو",
  "Job Viewed": "مشاهده آگهی",
  "Job Interested": "ثبت علاقه",
  "Job Rejected": "رد آگهی",
  "Resume Generated": "ساخت رزومه",
  "Resume Downloaded": "دانلود رزومه",
  "Source Job Opened": "باز کردن منبع آگهی",
};
export function DashboardView() {
  const { user, isAuthenticated } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    setError("");
    setData(null);
    apiClient
      .get("/api/dashboard")
      .then((res) => {
        if (alive) setData(unwrap(res.data) as DashboardData);
      })
      .catch(() => {
        if (alive) setError("دریافت داشبورد انجام نشد.");
      });
    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.id, reload]);
  if (!isAuthenticated)
    return (
      <p>
        برای مشاهده داشبورد <Link href="/login">وارد حساب شوید.</Link>
      </p>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-2xl border border-slate-200 bg-light-surface p-6 dark:border-dark-border dark:bg-dark-surface"
      >
        <h1 className="text-lg font-bold">داشبورد من</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {error}
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
          onClick={() => setReload((n) => n + 1)}
        >
          تلاش دوباره
        </button>
      </div>
    );
  if (!data)
    return (
      <PageLoading
        title="در حال دریافت داشبورد…"
        description="فرصت‌های منتخب و فعالیت‌های اخیرت را دریافت می‌کنیم."
      />
    );
  const box =
    "min-w-0 rounded-2xl border border-slate-200 bg-light-surface p-5 sm:p-6 dark:border-dark-border dark:bg-dark-surface";
  const muted = "text-sm leading-7 text-slate-600 dark:text-slate-300";
  const action =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700";
  const number = (value: number) => value.toLocaleString("fa-IR");
  const completion = Math.min(100, Math.max(0, data.profileCompletion));
  const nextStep =
    completion < 100
      ? {
          title: "اول، کمی از خودت بگو",
          description:
            "مهارت‌ها و سابقه‌ات را اضافه کن تا پیشنهادها به تو نزدیک‌تر شوند.",
          href: "/profile",
          label: "تکمیل پروفایل",
          icon: "user",
        }
      : !data.resumeCount
        ? {
            title: "برای فرصت بعدی آماده شو",
            description:
              "با اطلاعات پروفایلت رزومه بساز و برای شغل دلخواهت آماده باش.",
            href: "/resume",
            label: "ساخت رزومه",
            icon: "file-lines",
          }
        : {
            title: "فرصت بعدی‌ات را پیدا کن",
            description:
              "به دستیار بگو دنبال چه شغلی هستی؛ جستجو را از همان‌جا ادامه بده.",
            href: "/chat",
            label: "جستجو با دستیار",
            icon: "comments",
          };
  const jobRow = (job: Job) => (
    <li key={job.id}>
      <Link
        href={`/jobs/${job.id}`}
        className="group flex min-h-16 min-w-0 items-center gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-dark-card"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-dark-card dark:text-slate-300">
          <Icon name="briefcase" className="text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-bold leading-6">
            <bdi>{job.title}</bdi>
          </h3>
          <p className="mt-1 break-words text-xs leading-6 text-slate-500 dark:text-slate-400">
            <bdi>{job.company}</bdi>
            {job.location && (
              <>
                {" "}
                · <bdi>{job.location}</bdi>
              </>
            )}
          </p>
          {typeof job.match?.matchScore === "number" && (
            <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-200">
              تطابق {number(job.match.matchScore)}٪
            </p>
          )}
        </div>
        <Icon
          name="arrow-left"
          className="shrink-0 text-slate-400 group-hover:text-brand-500"
        />
      </Link>
    </li>
  );
  return (
    <section aria-label="داشبورد من" className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">
          سلام{user?.firstName ? ` ${user.firstName}` : ""} 👋
        </h1>
        <p className={`mt-2 ${muted}`}>
          از اینجا قدم بعدی مسیر شغلی‌ات را بردار.
        </p>
      </header>

      <div className="flex flex-col gap-5 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 dark:bg-dark-surface dark:text-brand-200 sm:flex">
            <Icon name={nextStep.icon} className="text-2xl" />
          </span>
          <div>
            <p className="mb-2 text-xs font-bold text-brand-600 dark:text-brand-200">
              قدم بعدی تو
            </p>
            <h2 className="text-lg font-bold">{nextStep.title}</h2>
            <p className={`mt-2 ${muted}`}>{nextStep.description}</p>
          </div>
        </div>
        <Link href={nextStep.href} className={`shrink-0 ${action}`}>
          {nextStep.label}
          <Icon name="arrow-left" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            label: "پروفایل من",
            value: `${number(completion)}٪`,
            hint: completion === 100 ? "مشاهده و ویرایش" : "تکمیل اطلاعات",
            href: "/profile",
            icon: "user",
          },
          {
            label: "رزومه‌های من",
            value: number(data.resumeCount),
            hint: "ساخت و مدیریت رزومه",
            href: "/resume",
            icon: "file-lines",
          },
          {
            label: "فرصت‌های ذخیره‌شده",
            value: number(data.interestedCount),
            hint: "مشاهده در همین صفحه",
            href: "#saved-jobs",
            icon: "briefcase",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-light-surface p-3 hover:border-brand-200 dark:border-dark-border dark:bg-dark-surface dark:hover:border-brand-500/50 sm:p-5"
          >
            <Icon
              name={item.icon}
              className="hidden text-xl text-slate-400 sm:block"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <span className="text-xs font-semibold leading-6 sm:text-sm">
                  {item.label}
                </span>
                <strong className="text-xl font-black">{item.value}</strong>
              </div>
              {item.href === "/profile" && (
                <div
                  role="progressbar"
                  aria-label="تکمیل پروفایل"
                  aria-valuenow={completion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-dark-card"
                >
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              )}
              <p className="mt-2 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                {item.hint}
              </p>
            </div>
            <Icon
              name="arrow-left"
              className="hidden text-slate-400 group-hover:text-brand-500 sm:block"
            />
          </Link>
        ))}
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="recommended-title" className={box}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="recommended-title" className="font-bold">
              {data.resumeCount
                ? "پیشنهادهای مناسب شما"
                : "فرصت‌های تازه برای بررسی"}
            </h2>
            <Link
              href="/jobs"
              className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              همه فرصت‌ها
              <Icon name="arrow-left" />
            </Link>
          </div>
          {data.recommendations.length ? (
            <ul className="space-y-1">
              {data.recommendations.slice(0, 3).map(jobRow)}
            </ul>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-7 text-center dark:bg-dark-card">
              <Icon
                name="magnifying-glass"
                className="mb-3 text-2xl text-slate-400"
              />
              <h3 className="text-sm font-bold">اولین فرصتت را پیدا کن</h3>
              <p className={`mt-2 ${muted}`}>به دستیار بگو چه شغلی می‌خواهی.</p>
              <Link href="/chat" className={`mt-4 ${action}`}>
                جستجو را شروع کنید.
              </Link>
            </div>
          )}
        </section>
        <section aria-labelledby="conversations-title" className={box}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="conversations-title" className="font-bold">
              گفتگوهای اخیر
            </h2>
            <Link
              href="/chat"
              className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-200"
            >
              <Icon name="plus" />
              گفتگوی جدید
            </Link>
          </div>
          {data.recentConversations.length ? (
            <ul className="space-y-2">
              {data.recentConversations.slice(0, 3).map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`/chat?conversation=${encodeURIComponent(conversation.id)}`}
                    className="group flex min-h-16 items-center gap-3 rounded-xl bg-slate-50 p-3 hover:bg-slate-100 dark:bg-dark-card dark:hover:bg-dark-bg"
                  >
                    <Icon name="comments" className="text-lg text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 break-words text-sm leading-6">
                        {conversation.messages[0]?.content || "گفتگوی شغلی"}
                      </span>
                      <span className="mt-1 block text-xs text-brand-600 dark:text-brand-200">
                        ادامه گفتگو
                      </span>
                    </span>
                    <Icon name="arrow-left" className="text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-7 text-center">
              <Icon name="comments" className="mb-3 text-2xl text-slate-400" />
              <p className={muted}>
                هنوز گفتگویی نداری؛ دستیار برای شروع کنارت است.
              </p>
            </div>
          )}
        </section>
      </div>

      <section
        id="saved-jobs"
        aria-labelledby="saved-title"
        className={`${box} scroll-mt-24`}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="saved-title" className="font-bold">
            فرصت‌های ذخیره‌شده
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-dark-card dark:text-slate-300">
            {number(data.interestedCount)}
          </span>
        </div>
        {data.interestedJobs.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {data.interestedJobs.map(jobRow)}
          </ul>
        ) : (
          <p className={muted}>
            فرصتی که دوست داری را ذخیره کن تا اینجا راحت پیدایش کنی.{" "}
            <Link
              href="/jobs"
              className="inline-flex min-h-11 items-center font-bold text-brand-600 dark:text-brand-200"
            >
              دیدن فرصت‌ها <Icon name="arrow-left" />
            </Link>
          </p>
        )}
      </section>

      <details className={box}>
        <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-sm font-bold">
          تاریخچه جستجو و فعالیت{" "}
          <span className="mr-2 text-xs font-normal text-slate-500 dark:text-slate-400">
            برای مشاهده باز کن
          </span>
        </summary>
        <div className="mt-4 grid gap-6 border-t border-slate-200 pt-5 dark:border-dark-border md:grid-cols-2">
          <section aria-labelledby="searches-title">
            <h2 id="searches-title" className="mb-3 text-sm font-bold">
              جستجوهای اخیر
            </h2>
            {data.recentDiscoveries.length ? (
              <ul className="space-y-3">
                {data.recentDiscoveries.map((run) => (
                  <li key={run.id} className={muted}>
                    {number(run.resultCount)} فرصت ·{" "}
                    {run.status === "PARTIAL"
                      ? "بررسی بخشی از منابع"
                      : run.status === "FAILED"
                        ? "ناموفق"
                        : run.status === "RUNNING" || run.status === "PENDING"
                          ? "در حال جستجو"
                          : "ثبت‌شده"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={muted}>هنوز جستجویی ثبت نشده است.</p>
            )}
          </section>
          <section aria-labelledby="activity-title">
            <h2 id="activity-title" className="mb-3 text-sm font-bold">
              فعالیت اخیر
            </h2>
            {data.recentActivity.length ? (
              <ul className="space-y-3">
                {data.recentActivity.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>{labels[event.name] ?? "فعالیت حساب"}</span>
                    <time
                      dateTime={event.createdAt}
                      className="text-xs text-slate-500 dark:text-slate-400"
                    >
                      {new Date(event.createdAt).toLocaleDateString("fa-IR")}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={muted}>هنوز فعالیتی ثبت نشده است.</p>
            )}
          </section>
        </div>
      </details>
    </section>
  );
}
