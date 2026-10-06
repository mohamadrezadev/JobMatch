"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { Icon } from "./Icon";
import { BrandLogo } from "@/components/ui/BrandLogo";

const links = [
  { href: "/", label: "شروع گفتگو", mobile: "گفتگو", icon: "comments" },
  { href: "/jobs", label: "کشف فرصت‌ها", mobile: "شغل‌ها", icon: "briefcase" },
  {
    href: "/dashboard",
    label: "داشبورد",
    mobile: "داشبورد",
    icon: "chart-line",
  },
  {
    href: "/chat",
    label: "دستیار هوشمند (AI)",
    mobile: "دستیار",
    icon: "wand-magic-sparkles",
  },
  {
    href: "/resume",
    label: "استودیو رزومه",
    mobile: "رزومه",
    icon: "file-lines",
  },
];
export function PathlyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountChecked, setAccountChecked] = useState(false);
  const [accountError, setAccountError] = useState("");
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, initialize, toggle } = useThemeStore();
  useEffect(() => initialize(), [initialize]);
  useEffect(() => {
    // The first React render uses the server snapshot before persisted Zustand hydration.
    if (useAuthStore.getState().isAuthenticated !== isAuthenticated) return;
    let alive = true;
    setAccountChecked(false);
    setAccountError("");
    if (!isAuthenticated) {
      const preview =
        process.env.NODE_ENV !== "production" &&
        new URLSearchParams(window.location.search).get("preview") === "design";
      if (!preview && !["/chat", "/jobs"].includes(pathname))
        router.replace("/login");
      setAccountChecked(true);
      return;
    }
    apiClient
      .get("/api/users/profile")
      .then((response) => {
        if (!alive) return;
        const complete = Boolean(
          (response.data.data ?? response.data).isProfileComplete,
        );
        useAuthStore.setState({ isProfileComplete: complete });
        if (!complete && !["/onboarding", "/profile"].includes(pathname))
          router.replace("/onboarding");
        setAccountChecked(true);
      })
      .catch((error) => {
        if (!alive) return;
        if (error.response?.status === 404) {
          useAuthStore.setState({ isProfileComplete: false });
          if (pathname !== "/onboarding") router.replace("/onboarding");
          setAccountChecked(true);
        } else
          setAccountError(
            "بررسی حساب انجام نشد. صفحه را دوباره بارگذاری کنید.",
          );
      });
    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.id, pathname, router]);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-light-bg text-slate-800 transition-colors duration-300 dark:bg-dark-bg dark:text-slate-100 md:flex-row">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -right-32 -top-32 h-96 w-96 animate-pulse-glow rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/15" />
        <div className="absolute -left-32 top-1/2 h-80 w-80 animate-pulse-glow rounded-full bg-emerald-500/10 blur-3xl [animation-delay:1.5s]" />
      </div>
      <aside className="relative z-20 hidden w-64 shrink-0 flex-col justify-between border-l border-slate-200 bg-light-surface p-4 dark:border-dark-border dark:bg-dark-surface md:flex">
        <div>
          <Link
            href="/"
            className="mb-6 flex items-center justify-between border-b border-slate-100 px-2 py-3 dark:border-dark-border/50"
          >
            <BrandLogo variant="wordmark" className="w-full" />
          </Link>
          <nav className="space-y-1" aria-label="ناوبری اصلی">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active(link.href) ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active(link.href) ? "bg-brand-500/10 text-brand-500 font-bold dark:text-slate-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-dark-card"}`}
              >
                <Icon
                  name={link.icon}
                  className={`w-5 text-center ${link.href === "/academy" ? "text-emerald-500" : link.href === "/chat" ? "text-brand-500" : "text-slate-400"}`}
                />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-dark-border">
          {isAuthenticated && (
            <Link href="/settings" className="block px-3 text-sm">
              تنظیمات
            </Link>
          )}
          <button
            onClick={toggle}
            type="button"
            aria-label="تغییر تم سایت"
            className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:opacity-90 dark:bg-dark-card dark:text-slate-300"
          >
            <span className="flex items-center gap-2">
              <Icon
                name={theme === "dark" ? "sun" : "moon"}
                className={
                  theme === "dark" ? "text-amber-500" : "text-indigo-400"
                }
              />
              <span>تغییر تم سایت</span>
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] dark:bg-dark-border">
              {theme === "dark" ? "تاریک" : "روشن"}
            </span>
          </button>
          <Link
            href={isAuthenticated ? "/profile" : "/login"}
            className="flex items-center gap-3 rounded-xl bg-slate-100 p-2 dark:bg-dark-card/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand-500 to-indigo-600 text-sm font-bold text-white">
              {isAuthenticated && user
                ? user.firstName.slice(0, 1) + user.lastName.slice(0, 1)
                : "ج‌م"}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {isAuthenticated && user
                  ? `${user.firstName} ${user.lastName}`
                  : "مهمان کارمچ"}
              </p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                {isAuthenticated
                  ? "مشاهده و ویرایش پروفایل"
                  : "مسیر شغلی‌ات را شروع کن"}
              </p>
            </div>
          </Link>
          {isAuthenticated && (
            <button
              aria-label="خروج از حساب"
              onClick={logout}
              className="absolute bottom-7 left-6 text-[10px] text-slate-400 hover:text-rose-500"
            >
              <Icon name="right-from-bracket" />
            </button>
          )}
        </div>
      </aside>
      <nav
        aria-label="ناوبری موبایل"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-light-surface px-3 py-2 text-slate-600 dark:border-dark-border dark:bg-dark-surface dark:text-slate-400 md:hidden"
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active(link.href) ? "page" : undefined}
            className={`flex flex-col items-center gap-1 text-xs ${active(link.href) ? "text-brand-500 font-bold" : link.href === "/academy" ? "text-emerald-500" : ""}`}
          >
            <Icon name={link.icon} className="text-base" />
            <span>{link.mobile}</span>
          </Link>
        ))}
      </nav>
      <main className="z-10 min-w-0 flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-6">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-dark-border md:hidden">
          <Link
            href="/"
            aria-label="کارمچ، صفحه اصلی"
            className="flex items-center gap-2"
          >
            <BrandLogo className="h-8 w-8" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={isAuthenticated ? "/profile" : "/login"}
              className="text-xs text-brand-500"
            >
              {isAuthenticated ? "پروفایل" : "ورود"}
            </Link>
            <button
              type="button"
              aria-label="تغییر تم سایت"
              onClick={toggle}
              className="rounded-lg bg-slate-100 p-2 dark:bg-dark-card"
            >
              <Icon
                name="circle-half-stroke"
                className="text-slate-600 dark:text-slate-300"
              />
            </button>
          </div>
        </div>
        {accountError ? (
          <p role="alert">{accountError}</p>
        ) : accountChecked ? (
          children
        ) : (
          <p role="status">در حال بررسی حساب…</p>
        )}
      </main>
    </div>
  );
}
