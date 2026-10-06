"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { unwrap } from "@/lib/pathly-data";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Job } from "@/types/job";
import { Icon } from "./Icon";
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
      <p role="alert">
        {error}{" "}
        <button onClick={() => setReload((n) => n + 1)}>تلاش دوباره</button>
      </p>
    );
  if (!data) return <p role="status">در حال دریافت داشبورد…</p>;
  const box =
    "min-w-0 break-words rounded-3xl border border-slate-200 bg-light-surface p-5 sm:p-6 dark:border-dark-border dark:bg-dark-surface";
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-brand-500">
            فضای کاری شخصی
          </p>
          <h1 className="text-2xl font-black">
            سلام {user?.firstName}، مسیر شغلی شما
          </h1>
          <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            گفتگوها، فرصت‌های منتخب و اطلاعات شغلی‌ات را از همین‌جا دنبال کن.
          </p>
        </div>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-xs font-bold text-white"
        >
          <Icon name="comments" /> ادامه با دستیار
        </Link>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["تکمیل پروفایل", `${data.profileCompletion}٪`],
          ["رزومه‌های ساخته‌شده", data.resumeCount],
          ["فرصت‌های مورد علاقه", data.interestedCount],
        ].map(([label, value]) => (
          <div key={label} className={box}>
            <p>{label}</p>
            <strong className="text-2xl">{value}</strong>
          </div>
        ))}
      </div>
      {!data.resumeCount && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-brand-500/20 bg-brand-500/5 p-5">
          <div>
            <h2 className="text-sm font-bold">
              برای تطابق شخصی، رزومه‌ات را بساز
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
              فعلاً درصد تطابقی نمایش نمی‌دهیم. می‌توانی گفتگو و جستجوی آگهی را
              ادامه بدهی.
            </p>
          </div>
          <Link href="/profile" className="text-xs font-bold text-brand-500">
            افزودن اطلاعات واقعی <Icon name="arrow-left" />
          </Link>
        </div>
      )}
      {data.profileCompletion < 100 && (
        <Link href="/onboarding" className="block text-brand-500">
          پروفایل خود را تکمیل کنید.
        </Link>
      )}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <div className={box}>
          <h2 className="mb-4 font-bold">
            {data.resumeCount
              ? "پیشنهادهای مناسب شما"
              : "فرصت‌های تازه برای بررسی"}
          </h2>
          {data.recommendations.length ? (
            data.recommendations.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="mb-3 block border-b pb-3"
              >
                <strong>{job.title}</strong>
                <p>
                  {job.company}
                  {typeof job.match?.matchScore === "number"
                    ? ` — تطابق ${job.match.matchScore}٪`
                    : " — تطابق هنوز محاسبه نشده"}
                </p>
              </Link>
            ))
          ) : (
            <p>
              هنوز فرصتی پیدا نشده است.{" "}
              <Link href="/chat" className="text-brand-500">
                جستجو را شروع کنید.
              </Link>
            </p>
          )}
        </div>
        <div className={box}>
          <h2 className="mb-4 font-bold">گفتگوهای اخیر</h2>
          {data.recentConversations.length ? (
            data.recentConversations.map((c) => (
              <Link
                key={c.id}
                href={`/chat?conversation=${c.id}`}
                className="mb-3 block truncate text-brand-500"
              >
                {c.messages[0]?.content || "ادامه گفتگو"}
              </Link>
            ))
          ) : (
            <Link href="/chat">اولین گفتگوی شغلی خود را شروع کنید.</Link>
          )}
        </div>
        <div className={box}>
          <h2 className="mb-4 font-bold">جستجوهای اخیر</h2>
          {data.recentDiscoveries.length ? (
            data.recentDiscoveries.map((run) => (
              <p key={run.id}>
                {run.resultCount} فرصت —{" "}
                {run.status === "PARTIAL"
                  ? "بررسی بخشی از منابع"
                  : run.status === "FAILED"
                    ? "ناموفق"
                    : "ثبت‌شده"}
              </p>
            ))
          ) : (
            <p>هنوز جستجویی ثبت نشده است.</p>
          )}
        </div>
        <div className={box}>
          <h2 className="mb-4 font-bold">فعالیت اخیر</h2>
          {data.recentActivity.length ? (
            data.recentActivity.map((event) => (
              <p key={event.id}>
                {labels[event.name] ?? "فعالیت حساب"} —{" "}
                {new Date(event.createdAt).toLocaleDateString("fa-IR")}
              </p>
            ))
          ) : (
            <p>هنوز فعالیتی ثبت نشده است.</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link href="/resume">رزومه‌ها</Link>
        <Link href="/jobs">همه فرصت‌ها</Link>
        <Link href="/settings">ترجیحات شغلی</Link>
      </div>
    </section>
  );
}
