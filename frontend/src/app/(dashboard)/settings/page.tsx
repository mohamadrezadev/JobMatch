"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/pathly/Icon";
import {
  WorkspaceHeading,
  WorkspaceSection,
} from "@/components/pathly/AccountWorkspace";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import apiClient from "@/lib/api-client";
import { unwrap } from "@/lib/pathly-data";
const workOptions = [
  {
    value: "Remote",
    label: "دورکار",
    description: "از هر جا کار کن",
    icon: "comments",
  },
  {
    value: "OnSite",
    label: "حضوری",
    description: "در محل شرکت",
    icon: "briefcase",
  },
  {
    value: "Hybrid",
    label: "ترکیبی",
    description: "حضوری و دورکار",
    icon: "layer-group",
  },
];
export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const [workType, setWorkType] = useState("");
  const [salary, setSalary] = useState(""),
    [location, setLocation] = useState("");
  const [busy, setBusy] = useState(true),
    [notice, setNotice] = useState(""),
    [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    setBusy(true);
    setNotice("");
    setFailed(false);
    apiClient
      .get("/api/users/preferences")
      .then((res) => {
        if (!alive) return;
        const data = unwrap(res.data) as {
          workType: string | null;
          desiredSalary: number | null;
          location: string | null;
        };
        setWorkType(data.workType ?? "");
        setSalary(data.desiredSalary?.toString() ?? "");
        setLocation(data.location ?? "");
      })
      .catch(() => {
        if (alive) {
          setFailed(true);
          setNotice("دریافت تنظیمات انجام نشد.");
        }
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [reload]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setFailed(false);
    try {
      await apiClient.put("/api/users/preferences", {
        workType: workType || null,
        location,
        desiredSalary: salary !== "" ? Number(salary) : null,
      });
      setNotice("تنظیمات ذخیره شد.");
    } catch {
      setFailed(true);
      setNotice("ذخیره تنظیمات انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <WorkspaceHeading
        eyebrow="حساب من / تنظیمات"
        title="فضای کارت، به انتخاب تو"
        description="ترجیحات شغلی و ظاهر برنامه را از همین‌جا مدیریت کن."
      />
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-5 lg:col-span-8">
          <form onSubmit={save}>
            <WorkspaceSection
              title="ترجیحات شغلی"
              description="این‌ها ترجیحات کلی تو هستند. شرایط هر جستجو را در گفتگو هم می‌توانی تغییر بدهی."
              icon="briefcase"
            >
              <fieldset disabled={busy} className="min-w-0">
                <legend className="mb-3 text-xs font-bold">نوع همکاری</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {workOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition sm:flex-col sm:items-start ${workType === option.value ? "border-brand-500 bg-brand-500/5" : "border-slate-200 hover:border-slate-400 dark:border-dark-border"}`}
                    >
                      <input
                        type="radio"
                        name="work-type"
                        value={option.value}
                        checked={workType === option.value}
                        onChange={() => setWorkType(option.value)}
                        className="absolute left-4 top-4 accent-brand-500"
                      />
                      <Icon
                        name={option.icon}
                        className={`text-xl ${workType === option.value ? "text-brand-500" : "text-slate-400"}`}
                      />
                      <span className="block">
                        <span className="block text-sm font-bold">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {workType && (
                  <button
                    type="button"
                    onClick={() => setWorkType("")}
                    className="mt-3 text-xs text-slate-500 underline"
                  >
                    ترجیح مشخصی ندارم
                  </button>
                )}
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Input
                    label="شهر"
                    placeholder="مثلاً تهران"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <Input
                    label="حداقل حقوق ماهانه"
                    type="number"
                    min="0"
                    placeholder="به تومان، مثلاً ۳۰۰۰۰۰۰۰"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
                <p className="mt-3 text-[11px] leading-6 text-slate-400">
                  شهر برای موقعیت‌های حضوری و ترکیبی لحاظ می‌شود. حقوق خالی یعنی
                  هنوز حداقلی مشخص نکرده‌ای.
                </p>
              </fieldset>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-dark-border">
                <div>
                  {notice && (
                    <p
                      role={failed ? "alert" : "status"}
                      className={`text-xs ${failed ? "text-rose-500" : "text-emerald-500"}`}
                    >
                      {notice}
                    </p>
                  )}
                  {failed && (
                    <button
                      type="button"
                      onClick={() => setReload((n) => n + 1)}
                      className="mt-2 text-xs text-brand-500 underline"
                    >
                      بارگذاری دوباره
                    </button>
                  )}
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? "در حال پردازش…" : "ذخیره تنظیمات"}
                </Button>
              </div>
            </WorkspaceSection>
          </form>
          <WorkspaceSection
            title="ظاهر برنامه"
            description="تمی را انتخاب کن که کارکردن با آن برایت راحت‌تر است."
            icon="sun"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={theme === mode}
                  onClick={() => {
                    if (theme !== mode) toggle();
                  }}
                  className={`overflow-hidden rounded-2xl border p-3 text-right ${theme === mode ? "border-brand-500 ring-2 ring-brand-500/10" : "border-slate-200 dark:border-dark-border"}`}
                >
                  <div
                    className={`mb-4 flex h-24 gap-2 rounded-xl p-3 ${mode === "dark" ? "bg-slate-950" : "bg-slate-100"}`}
                  >
                    <div
                      className={`w-8 rounded-lg ${mode === "dark" ? "bg-slate-800" : "bg-white"}`}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded bg-brand-500/70" />
                      <div
                        className={`h-5 rounded ${mode === "dark" ? "bg-slate-800" : "bg-white"}`}
                      />
                      <div
                        className={`h-5 rounded ${mode === "dark" ? "bg-slate-800" : "bg-white"}`}
                      />
                    </div>
                  </div>
                  <span className="flex items-center justify-between px-1 text-xs font-bold">
                    <span>
                      <Icon
                        name={mode === "dark" ? "moon" : "sun"}
                        className="ml-2"
                      />
                      {mode === "dark" ? "تیره" : "روشن"}
                    </span>
                    {theme === mode && (
                      <Icon name="circle-check" className="text-brand-500" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        </div>
        <aside className="space-y-5 lg:col-span-4">
          <WorkspaceSection
            title="حساب کاربری"
            description="اطلاعات حسابی که با آن وارد شده‌ای."
            icon="user"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-lg font-black text-brand-500">
                {user?.firstName.slice(0, 1) || <Icon name="user" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {user?.firstName} {user?.lastName}
                </p>
                <p dir="ltr" className="mt-1 break-all text-xs text-slate-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-brand-500"
            >
              ویرایش اطلاعات شخصی <Icon name="arrow-left" />
            </Link>
          </WorkspaceSection>
          <div className="rounded-3xl border border-brand-500/15 bg-brand-500/5 p-6">
            <Icon name="compass" className="text-2xl text-brand-500" />
            <h2 className="mt-4 text-sm font-extrabold">از خواسته‌ات بگو</h2>
            <p className="mt-2 text-xs leading-7 text-slate-500 dark:text-slate-400">
              برای تغییر مسیر لازم نیست فرم‌ها را از اول پر کنی. کافی است شرایط
              جدیدت را در دستیار بنویسی.
            </p>
            <Link
              href="/chat"
              className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-brand-500"
            >
              رفتن به دستیار <Icon name="arrow-left" />
            </Link>
          </div>
          <div className="rounded-3xl border border-slate-200 p-6 dark:border-dark-border">
            <h2 className="text-sm font-bold">خروج از حساب</h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              اطلاعات ذخیره‌شده در حسابت باقی می‌ماند.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-4 text-rose-500"
              onClick={logout}
            >
              <Icon name="right-from-bracket" className="ml-2" />
              خروج از حساب
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
