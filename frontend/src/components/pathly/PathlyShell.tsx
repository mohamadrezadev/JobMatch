"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useAuthReady } from "@/lib/use-auth-ready";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { Icon } from "./Icon";
import { BrandLogo } from "@/components/ui/BrandLogo";

const links = [
  { href: "/chat", label: "دستیار هوشمند", mobile: "دستیار", icon: "comments" },
  {
    href: "/jobs",
    label: "فرصت‌های شغلی",
    mobile: "فرصت‌ها",
    icon: "briefcase",
  },
  {
    href: "/dashboard",
    label: "داشبورد من",
    mobile: "داشبورد",
    icon: "chart-line",
  },
  { href: "/resume", label: "رزومه‌ساز", mobile: "رزومه", icon: "file-lines" },
  {
    href: "/profile",
    label: "پروفایل و مهارت‌ها",
    mobile: "پروفایل",
    icon: "user",
  },
  {
    href: "/settings",
    label: "تنظیمات حساب",
    mobile: "تنظیمات",
    icon: "sliders",
  },
];

export function PathlyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const ready = useAuthReady();
  const leavingAfterLogout = useRef(false);
  const { user, isAuthenticated, isProfileComplete, logout } = useAuthStore();
  const { theme, initialize, toggle } = useThemeStore();
  useEffect(() => initialize(), [initialize]);
  useEffect(() => {
    if (!ready || leavingAfterLogout.current) return;
    if (!isAuthenticated) {
      const preview =
        process.env.NODE_ENV !== "production" &&
        new URLSearchParams(window.location.search).get("preview") === "design";
      if (!preview && !["/chat", "/jobs"].includes(pathname))
        router.replace("/login");
      return;
    }
    let alive = true;
    apiClient
      .get("/api/users/profile")
      .then((response) => {
        if (alive)
          useAuthStore.setState({
            isProfileComplete: Boolean(
              (response.data.data ?? response.data).isProfileComplete,
            ),
          });
      })
      .catch((error) => {
        if (alive && error.response?.status === 404)
          useAuthStore.setState({ isProfileComplete: false });
      });
    return () => {
      alive = false;
    };
  }, [ready, isAuthenticated, user?.id, pathname, router]);
  const active = (href: string) => pathname.startsWith(href);
  const pageTitle =
    links.find((link) => active(link.href))?.label ?? "فضای کاری";
  const navigation = (mobile = false) =>
    (mobile ? links.slice(0, 4) : links).map((link) => (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active(link.href) ? "page" : undefined}
        className={
          mobile
            ? `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${active(link.href) ? "text-brand-500" : "text-slate-500 dark:text-slate-400"}`
            : `flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm transition-all ${active(link.href) ? "bg-brand-500 font-bold text-white shadow-lg shadow-brand-500/20" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-dark-card"}`
        }
      >
        <Icon name={link.icon} className="shrink-0 text-base" />
        <span>{mobile ? link.mobile : link.label}</span>
      </Link>
    ));
  return (
    <div className="app-shell min-h-screen bg-light-bg text-slate-800 dark:bg-dark-bg dark:text-slate-100">
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl dark:border-dark-border dark:bg-dark-surface/95 md:px-7">
        <Link
          href={isAuthenticated ? "/chat" : "/"}
          aria-label="کارمچ، صفحه اصلی"
          className="shrink-0"
        >
          <BrandLogo variant="wordmark" className="w-36 sm:w-40" />
        </Link>
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-dark-border dark:bg-dark-card md:flex">
          <Icon name="compass" /> فضای کاری شما{" "}
          <span className="text-slate-300 dark:text-slate-600">/</span>{" "}
          {pageTitle}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="تغییر تم سایت"
            onClick={toggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-dark-border dark:text-amber-300"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <Link
            href={isAuthenticated ? "/profile" : "/login"}
            className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-dark-border dark:bg-dark-card"
            aria-label={isAuthenticated ? "مشاهده پروفایل" : "ورود به حساب"}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-xs font-black text-brand-500">
              {isAuthenticated ? (
                user?.firstName.slice(0, 1)
              ) : (
                <Icon name="user" />
              )}
            </span>
            <span className="hidden max-w-32 truncate pl-2 text-xs font-bold sm:block">
              {isAuthenticated ? user?.firstName : "ورود به حساب"}
            </span>
          </Link>
        </div>
      </header>
      <div className="flex min-w-0 items-start">
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] w-60 shrink-0 flex-col justify-between overflow-y-auto border-l border-slate-200 bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface md:flex xl:w-64">
          <div>
            <p className="mb-4 px-3 pt-3 text-[10px] font-bold tracking-wide text-slate-400">
              مسیر شغلی شما
            </p>
            <nav aria-label="ناوبری اصلی" className="space-y-2">
              {navigation()}
            </nav>
          </div>
          <div className="mt-8 space-y-4">
            {isAuthenticated && !isProfileComplete && (
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
                <p className="text-xs font-bold text-brand-500">
                  پیشنهادهایی براساس خودت
                </p>
                <p className="mt-2 text-[11px] leading-6 text-slate-500 dark:text-slate-400">
                  گفتگو آزاد است. برای تطابق شخصی، مهارت‌ها و سابقه واقعی‌ات را
                  اضافه کن.
                </p>
                <Link
                  href="/profile"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-brand-500"
                >
                  تکمیل پروفایل <Icon name="arrow-left" />
                </Link>
              </div>
            )}
            {isAuthenticated && (
              <button
                onClick={() => {
                  leavingAfterLogout.current = true;
                  logout();
                  router.replace("/");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-rose-500"
              >
                <Icon name="right-from-bracket" /> خروج از حساب
              </button>
            )}
            <p className="px-3 text-[10px] text-slate-400">
              کارمچ · قدم بعدی، روشن‌تر
            </p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 md:pb-8 lg:p-8">
          <div className="mx-auto max-w-[1440px]">
            {ready ? (
              children
            ) : (
              <p role="status" className="p-6 text-sm text-slate-400">
                در حال آماده‌کردن فضای کاری…
              </p>
            )}
          </div>
        </main>
      </div>
      <nav
        aria-label="ناوبری موبایل"
        className="mobile-dock fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-xl dark:border-dark-border dark:bg-dark-surface/95 md:hidden"
      >
        {navigation(true)}
      </nav>
    </div>
  );
}
