"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthReady } from "@/lib/use-auth-ready";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Icon } from "@/components/pathly/Icon";
import ChatExperience from "@/components/chat/ChatExperience";
import { PwaInstallButton } from "@/components/pwa/PwaControls";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";

const benefits = [
  {
    icon: "comments",
    title: "از یک گفتگوی ساده شروع کن",
    text: "لازم نیست از قبل رزومه آماده یا مقصد دقیقی داشته باشی. از چیزی که می‌خواهی بگو.",
  },
  {
    icon: "sliders",
    title: "شرایط دلخواهت را روشن کن",
    text: "نقش، دورکاری، شهر و حقوق دلخواهت را مشخص کن و در ادامه تغییر بده.",
  },
  {
    icon: "route",
    title: "قدم بعدی را انتخاب کن",
    text: "گفتگو، بررسی فرصت‌ها و ساخت رزومه را در یک فضای مشترک دنبال کن.",
  },
];
export function LandingPage() {
  const ready = useAuthReady();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { initialize, toggle, theme } = useThemeStore();
  useEffect(() => initialize(), [initialize]);
  useEffect(() => {
    if (ready && isAuthenticated) router.replace("/chat");
  }, [ready, isAuthenticated, router]);
  if (!ready || isAuthenticated)
    return (
      <p role="status" className="p-8 text-center text-sm text-slate-400">
        در حال آماده‌کردن گفتگو…
      </p>
    );
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-light-bg text-slate-800 dark:bg-dark-bg dark:text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-48 -top-48 h-[600px] w-[600px] rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -left-48 top-[500px] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-6 sm:px-8">
        <Link
          href="/"
          aria-label="کارمچ، صفحه اصلی"
          className="flex items-center gap-3"
        >
          <BrandLogo
            variant="wordmark"
            className="hidden w-48 sm:inline-flex"
          />
          <BrandLogo variant="icon" className="h-10 w-10 sm:hidden" />
        </Link>
        <nav
          aria-label="ناوبری صفحه اصلی"
          className="flex items-center gap-3 sm:gap-5"
        >
          <a
            href="#how-it-works"
            className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline"
          >
            چطور کار می‌کند؟
          </a>
          <PwaInstallButton />
          <button
            aria-label="تغییر تم سایت"
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-dark-border"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white"
            >
              حساب {user?.firstName}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-xs font-bold">
                ورود
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white"
              >
                ثبت‌نام
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <section className="pb-10 pt-8 text-center sm:pb-14 sm:pt-14">
          <BrandLogo
            variant="full"
            className="mx-auto mb-8 w-full max-w-xl"
            priority
          />
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Icon name="wand-magic-sparkles" />
            مسیر شغلی‌ات از همین گفتگو شروع می‌شود
          </p>
          <h1 className="mx-auto max-w-3xl text-3xl font-black leading-[1.6] tracking-tight sm:text-5xl sm:leading-[1.5]">
            قدم بعدی شغلت را
            <br />
            <span className="bg-gradient-to-l from-brand-500 to-emerald-400 bg-clip-text text-transparent">
              با گفتگو پیدا کن.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-slate-500 dark:text-slate-400">
            از مهارت‌ها و کاری که دوست داری بگو. کارمچ کمک می‌کند خواسته‌هایت را
            روشن کنی و مسیرت را قدم‌به‌قدم جلو ببری.
          </p>
          <a
            href="#start-chat"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-5 py-2.5 text-xs font-bold text-brand-500"
          >
            {isAuthenticated
              ? "ادامه گفتگو"
              : "همین حالا شروع کن؛ بدون ثبت‌نام"}
            <Icon name="arrow-down" />
          </a>
        </section>
        <div className="grid items-start gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <div id="start-chat" className="scroll-mt-8">
              <ChatExperience />
            </div>
          </div>
          <aside className="space-y-6 lg:col-span-4 lg:pt-4">
            <h2 className="text-lg font-extrabold">
              یک همراه برای تصمیم‌های شغلی
            </h2>
            {benefits.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-500/15 bg-brand-500/10 text-brand-500">
                  <Icon name={item.icon} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <p className="mt-2 text-xs leading-7 text-slate-500 dark:text-slate-400">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                با حرف‌های خودت، برای مسیر خودت
              </p>
              <p className="mt-2 text-xs leading-7 text-slate-500 dark:text-slate-400">
                ترجیح شغلی با مهارت واقعی فرق دارد. کارمچ این دو را جدا نگه
                می‌دارد تا خواسته‌هایت به سوابقت اضافه نشوند.
              </p>
            </div>
          </aside>
        </div>
        <section id="how-it-works" className="scroll-mt-10 py-16 sm:py-24">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold text-brand-500">ساده شروع کن</p>
            <h2 className="mt-3 text-2xl font-black">
              سه قدم برای روشن‌تر شدن مسیر
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                "۱",
                "از خودت بگو",
                "مهارت‌ها، تجربه یا شغل دلخواهت را در چت بنویس. فرم طولانی در شروع لازم نیست.",
              ],
              [
                "۲",
                "ترجیحاتت را تنظیم کن",
                "اگر نظرت عوض شد، در همان گفتگو شرایط جدیدت را بگو.",
              ],
              [
                "۳",
                "گفتگو را نگه دار",
                "برای ادامه بعد از ۵ پیام، وارد شو یا حساب بساز؛ گفتگو از همان‌جا ادامه پیدا می‌کند.",
              ],
            ].map(([number, title, text]) => (
              <article
                key={number}
                className="rounded-2xl border border-slate-200 bg-light-surface p-6 dark:border-dark-border dark:bg-dark-surface"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-lg font-black text-brand-500">
                  {number}
                </span>
                <h3 className="mt-5 text-sm font-bold">{title}</h3>
                <p className="mt-3 text-xs leading-7 text-slate-500 dark:text-slate-400">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-xl font-black">قبل از شروع</h2>
          {[
            [
              "برای شروع باید ثبت‌نام کنم؟",
              "نه. می‌توانی ۵ پیام بدون حساب بفرستی. برای ادامه گفتگو و ذخیره آن در حسابت، ثبت‌نام لازم است.",
            ],
            [
              "بعد از ثبت‌نام گفتگویم از بین می‌رود؟",
              "نه. گفتگو برای ۲۴ ساعت در نشست مهمان نگه داشته می‌شود. در همین مرورگر وارد حساب شو تا گفتگو به حسابت منتقل شود و از همان‌جا ادامه بدهی.",
            ],
            [
              "آیا در چت آگهی واقعی پیدا می‌شود؟",
              "پس از ورود، وقتی نقش و شرایط دلخواهت مشخص شد، جستجوی آگهی‌های منابع ایرانی از همان چت شروع می‌شود. اگر سرویس جستجو در دسترس نباشد، پیام آن را می‌بینی و گفتگو حفظ می‌شود.",
            ],
          ].map(([question, answer]) => (
            <details
              key={question}
              className="mb-3 rounded-2xl border border-slate-200 bg-light-surface px-5 py-4 dark:border-dark-border dark:bg-dark-surface"
            >
              <summary className="cursor-pointer text-sm font-bold">
                {question}
              </summary>
              <p className="mt-3 text-xs leading-7 text-slate-500 dark:text-slate-400">
                {answer}
              </p>
            </details>
          ))}
        </section>
      </main>
      <footer className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-7 text-xs text-slate-500 dark:border-dark-border dark:text-slate-400 sm:px-8">
        <span>کارمچ · قدم بعدی، روشن‌تر</span>
        <div className="flex gap-5">
          <a href="#start-chat">شروع گفتگو</a>
          <Link href={isAuthenticated ? "/chat" : "/register"}>
            {isAuthenticated ? "گفتگوهای من" : "ساخت حساب"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
