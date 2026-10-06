"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Icon } from "@/components/pathly/Icon";
import { useAuthReady } from "@/lib/use-auth-ready";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  const ready = useAuthReady();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const { initialize, toggle, theme } = useThemeStore();
  useEffect(() => initialize(), [initialize]);
  useEffect(() => {
    if (ready && authenticated) router.replace("/chat");
  }, [ready, authenticated, router]);
  if (!ready || authenticated)
    return (
      <p role="status" className="p-8 text-center text-sm text-slate-400">
        در حال آماده‌کردن گفتگو…
      </p>
    );
  return (
    <main className="auth-page min-h-screen bg-light-bg px-4 py-6 text-slate-800 dark:bg-dark-bg dark:text-slate-100 sm:px-8 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-dark-border dark:bg-dark-surface lg:grid-cols-2">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-dark-surface to-cyan-950 p-10 text-white lg:flex xl:p-12">
          <Link href="/" aria-label="کارمچ، صفحه اصلی">
            <BrandLogo variant="wordmark" tone="inverse" className="w-40" />
          </Link>
          <div className="py-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200">
              <Icon name="compass" /> مسیر شغلی روشن
            </span>
            <h2 className="mt-6 text-4xl font-black leading-[1.7]">
              از خواسته امروزت
              <br />
              <span className="text-cyan-300">تا فرصت مناسب تو</span>
            </h2>
            <p className="mt-5 text-sm leading-8 text-slate-300">
              هر عنوان شغلی که در نظر داری بنویس. کارمچ شرایطت را روشن می‌کند،
              منابع را بررسی می‌کند و فرصت‌ها را کنار هم می‌گذارد.
            </p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/30 p-6">
              <p className="mb-5 flex items-center gap-2 text-sm font-bold">
                <Icon name="route" className="text-emerald-300" /> قدم‌های مسیر
                شما
              </p>
              <div className="space-y-4">
                {[
                  [
                    "comments",
                    "از کار دلخواهت بگو",
                    "عنوان شغلی، شهر، حقوق و نوع همکاری",
                  ],
                  [
                    "magnifying-glass",
                    "فرصت‌ها را کشف کن",
                    "آگهی‌های واقعی با لینک منبع",
                  ],
                  [
                    "file-lines",
                    "با اطلاعات خودت مقایسه کن",
                    "رزومه و مهارت‌های واقعی، بدون اطلاعات ساختگی",
                  ],
                ].map(([icon, title, text]) => (
                  <div key={title} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                      <Icon name={icon} />
                    </span>
                    <div>
                      <p className="text-xs font-bold">{title}</p>
                      <p className="mt-1 text-[11px] leading-6 text-slate-400">
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            کارمچ · مهارت‌های تو، فرصت مناسب تو.
          </p>
        </section>
        <section className="flex min-w-0 flex-col justify-between p-6 sm:p-10 xl:p-12">
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-slate-500"
            >
              <Icon name="arrow-right" /> بازگشت به صفحه اصلی
            </Link>
            <button
              aria-label="تغییر تم سایت"
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-dark-border"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
          </div>
          <div className="mx-auto w-full max-w-sm py-4 sm:py-8">
            <BrandLogo variant="wordmark" className="mb-8 w-40 lg:hidden" />
            {children}
          </div>
          <p className="mt-8 text-center text-[11px] text-slate-400">
            گفتگوی مهمان در همین مرورگر به حسابت منتقل می‌شود.
          </p>
        </section>
      </div>
    </main>
  );
}
