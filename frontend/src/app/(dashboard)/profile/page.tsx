"use client";
import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageLoading, LoadingState } from "@/components/ui/LoadingState";
import { Icon } from "@/components/pathly/Icon";
import {
  WorkspaceHeading,
  WorkspaceSection,
  accountField,
} from "@/components/pathly/AccountWorkspace";
import apiClient from "@/lib/api-client";
import type { UserSkill } from "@/types/user";
import { useAuthStore } from "@/stores/useAuthStore";

type ExperienceLevel = "Junior" | "Mid" | "Senior";
type WorkType = "Remote" | "OnSite" | "Hybrid";
export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false),
    [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  const [skills, setSkills] = useState<UserSkill[]>([]),
    [newSkill, setNewSkill] = useState("");
  const [form, setForm] = useState({
    title: "",
    bio: "",
    location: "",
    desiredSalary: "",
    experienceYears: "",
    experienceLevel: "" as ExperienceLevel | "",
    workType: "" as WorkType | "",
    resumeFacts: "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
  });
  useEffect(() => {
    void fetchProfile();
  }, []);
  async function fetchProfile() {
    setFetching(true);
    setError("");
    const results = await Promise.allSettled([
      apiClient.get("/api/users/profile"),
      apiClient.get("/api/users/skills"),
    ]);
    if (results[0].status === "fulfilled") {
      const p = results[0].value.data.data ?? results[0].value.data;
      setForm((previous) => ({
        ...previous,
        title: p.title ?? "",
        bio: p.bio ?? "",
        location: p.location ?? "",
        desiredSalary: p.desiredSalary?.toString() ?? "",
        experienceYears: p.experienceYears?.toString() ?? "",
        experienceLevel: p.experienceLevel ?? "",
        workType: p.workType ?? "",
        resumeFacts: (p.resumeFacts ?? []).join("\n"),
        firstName: p.user?.firstName ?? previous.firstName,
        lastName: p.user?.lastName ?? previous.lastName,
      }));
    } else if (results[0].reason.response?.status !== 404)
      setError("دریافت پروفایل انجام نشد. دوباره تلاش کنید.");
    if (results[1].status === "fulfilled")
      setSkills(results[1].value.data.data ?? results[1].value.data);
    else setError("دریافت مهارت‌ها انجام نشد. دوباره تلاش کنید.");
    setFetching(false);
  }
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const response = await apiClient.put("/api/users/profile", {
        ...form,
        resumeFacts: form.resumeFacts
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        experienceLevel: form.experienceLevel || null,
        workType: form.workType || null,
        desiredSalary: form.desiredSalary ? Number(form.desiredSalary) : null,
        experienceYears:
          form.experienceYears !== "" ? Number(form.experienceYears) : null,
      });
      const profile = response.data.data ?? response.data;
      const current = useAuthStore.getState().user;
      if (current)
        useAuthStore.setState({
          user: {
            ...current,
            firstName: form.firstName,
            lastName: form.lastName,
          },
          isProfileComplete: Boolean(profile.isProfileComplete),
        });
      setSaved(true);
    } catch {
      setError("ذخیره پروفایل انجام نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }
  async function addSkill() {
    if (!newSkill.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/api/users/skills", {
        skillName: newSkill.trim(),
        level: "Intermediate",
      });
      const entry = response.data.data ?? response.data;
      setSkills((rows) => [
        ...rows.filter((row) => row.skill.id !== entry.skill.id),
        entry,
      ]);
      setNewSkill("");
      setSaved(false);
    } catch {
      setError("افزودن مهارت انجام نشد.");
    } finally {
      setLoading(false);
    }
  }
  async function removeSkill(skillId: string) {
    setLoading(true);
    setError("");
    try {
      await apiClient.delete(`/api/users/skills/${skillId}`);
      if (skills.length === 1)
        useAuthStore.setState({ isProfileComplete: false });
      setSkills((rows) => rows.filter((row) => row.skill.id !== skillId));
      setSaved(false);
    } catch {
      setError("حذف مهارت انجام نشد.");
    } finally {
      setLoading(false);
    }
  }
  const checks = [
    ["عنوان شغلی", Boolean(form.title.trim())],
    ["مهارت‌ها", skills.length > 0],
    ["سابقه", form.experienceYears !== ""],
    ["سوابق و تحصیلات", Boolean(form.resumeFacts.trim())],
  ] as const;
  function change(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSaved(false);
  }
  if (fetching)
    return (
      <PageLoading
        title="در حال دریافت اطلاعات…"
        description="پروفایل و مهارت‌های ثبت‌شده‌ات را دریافت می‌کنیم."
        layout="form"
      />
    );
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <WorkspaceHeading
        eyebrow="حساب من / اطلاعات حرفه‌ای"
        title="پروفایل و مهارت‌های من"
        description="رزومه‌ای که از خودت می‌گوید؛ مهارت‌ها و تجربه‌ات را هر وقت آماده بودی اضافه کن."
        action={
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-500"
          >
            ادامه گفتگو <Icon name="arrow-left" />
          </Link>
        }
      />
      {loading && (
        <LoadingState
          title="در حال ثبت تغییرات پروفایل…"
          description="پس از دریافت پاسخ، نتیجه ذخیره نمایش داده می‌شود."
          compact
        />
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-500"
        >
          {error}
          <button
            type="button"
            onClick={() => void fetchProfile()}
            className="font-bold underline"
          >
            تلاش دوباره
          </button>
        </div>
      )}
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <aside className="order-2 space-y-5 lg:order-none lg:sticky lg:top-24 lg:col-span-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-dark-border dark:bg-dark-surface">
            <div className="h-20 bg-gradient-to-l from-brand-500/25 via-indigo-500/10 to-cyan-400/15" />
            <div className="px-6 pb-6">
              <div className="-mt-9 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-brand-500 text-2xl font-black text-white dark:border-dark-surface">
                {form.firstName.slice(0, 1) || <Icon name="user" />}
              </div>
              <h2 className="text-lg font-black">
                {[form.firstName, form.lastName].filter(Boolean).join(" ") ||
                  "پروفایل شما"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {form.title || "عنوان شغلی خودت را اضافه کن"}
              </p>
              <p
                dir="ltr"
                className="mt-4 break-all text-right text-xs text-slate-400"
              >
                {user?.email}
              </p>
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 dark:border-dark-border">
                {checks.map(([label, done]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                    <span
                      className={done ? "text-emerald-500" : "text-slate-400"}
                    >
                      {done ? <Icon name="circle-check" /> : "هنوز اضافه نشده"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-brand-500/15 bg-brand-500/5 p-6">
            <Icon name="comments" className="mb-3 text-xl text-brand-500" />
            <h2 className="text-sm font-bold">اول فرصتت را پیدا کن</h2>
            <p className="mt-2 text-xs leading-7 text-slate-500 dark:text-slate-400">
              تکمیل پروفایل برای گفتگو اجباری نیست. بعد از انتخاب آگهی، با
              اطلاعات واقعی خودت رزومه بساز.
            </p>
            <Link
              href="/jobs"
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand-500"
            >
              مشاهده فرصت‌ها <Icon name="arrow-left" />
            </Link>
          </div>
        </aside>
        <form
          onSubmit={handleSubmit}
          className="order-1 min-w-0 space-y-5 lg:order-none lg:col-span-8"
        >
          <WorkspaceSection
            title="اطلاعات شخصی"
            description="نام و معرفی کوتاه شما در رزومه نمایش داده می‌شود."
            icon="user"
            id="identity"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="نام"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => change("firstName", e.target.value)}
              />
              <Input
                label="نام خانوادگی"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => change("lastName", e.target.value)}
              />
            </div>
            <label className="mt-5 block text-xs font-semibold">
              درباره من
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => change("bio", e.target.value)}
                className={`${accountField} mt-2 resize-y`}
                placeholder="در چند جمله از تخصص، تجربه و علاقه شغلی‌ات بگو…"
              />
            </label>
          </WorkspaceSection>
          <WorkspaceSection
            title="مسیر حرفه‌ای"
            description="تخصص و سابقه واقعی‌ات را مشخص کن؛ حتی اگر تازه شروع کرده‌ای."
            icon="briefcase"
            id="career"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="نقش شغلی / Title"
                placeholder="مثلاً حسابدار"
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
              />
              <Input
                label="مکان"
                placeholder="مثلاً تهران"
                value={form.location}
                onChange={(e) => change("location", e.target.value)}
              />
              <Input
                label="سال‌های سابقه"
                type="number"
                min="0"
                max="50"
                value={form.experienceYears}
                onChange={(e) => change("experienceYears", e.target.value)}
              />
              <label className="text-xs font-semibold">
                سطح تجربه
                <select
                  aria-label="سطح تجربه"
                  value={form.experienceLevel}
                  onChange={(e) => change("experienceLevel", e.target.value)}
                  className={`${accountField} mt-2`}
                >
                  <option value="">انتخاب کنید</option>
                  <option value="Junior">تازه‌کار / Junior</option>
                  <option value="Mid">میانی / Mid</option>
                  <option value="Senior">ارشد / Senior</option>
                </select>
              </label>
              <Input
                label="حقوق ماهانه موردنظر"
                type="number"
                min="0"
                placeholder="به تومان"
                value={form.desiredSalary}
                onChange={(e) => change("desiredSalary", e.target.value)}
              />
              <label className="text-xs font-semibold">
                نوع همکاری
                <select
                  aria-label="نوع همکاری"
                  value={form.workType}
                  onChange={(e) => change("workType", e.target.value)}
                  className={`${accountField} mt-2`}
                >
                  <option value="">انتخاب کنید</option>
                  <option value="Remote">دورکار</option>
                  <option value="OnSite">حضوری</option>
                  <option value="Hybrid">ترکیبی</option>
                </select>
              </label>
            </div>
          </WorkspaceSection>
          <WorkspaceSection
            title="مهارت‌های ثبت‌شده"
            description="مهارت‌هایی که واقعاً داری؛ از Excel و حسابداری تا طراحی و برنامه‌نویسی."
            icon="layer-group"
            id="skills"
          >
            <div className="flex flex-col items-end gap-3 sm:flex-row">
              <Input
                label="مهارت جدید"
                value={newSkill}
                maxLength={100}
                placeholder="مثلاً Excel یا تحلیل داده"
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addSkill();
                  }
                }}
              />
              <Button
                type="button"
                className="w-full shrink-0 sm:w-auto"
                disabled={loading || fetching || !newSkill.trim()}
                onClick={() => void addSkill()}
              >
                <Icon name="plus" className="ml-2" />
                افزودن مهارت
              </Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {skills.map((entry) => (
                <span
                  key={entry.id}
                  className="inline-flex items-center gap-3 rounded-xl border border-brand-500/15 bg-brand-500/5 px-3 py-2 text-xs font-semibold"
                >
                  <span dir="auto">{entry.skill.name}</span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void removeSkill(entry.skill.id)}
                    aria-label={`حذف مهارت ${entry.skill.name}`}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Icon name="xmark" />
                  </button>
                </span>
              ))}
            </div>
            {!skills.length && (
              <p className="mt-4 text-xs leading-6 text-slate-400">
                هنوز مهارتی ثبت نکرده‌ای. با اولین مهارت شروع کن.
              </p>
            )}
          </WorkspaceSection>
          <WorkspaceSection
            title="سوابق، پروژه‌ها و تحصیلات"
            description="هر مورد را در یک خط بنویس. این اطلاعات، منبع ساخت رزومه هدفمند تو هستند."
            icon="graduation-cap"
            id="history"
          >
            <label className="block text-xs font-semibold">
              اطلاعات واقعی رزومه
              <textarea
                aria-label="اطلاعات واقعی رزومه"
                rows={6}
                value={form.resumeFacts}
                onChange={(e) => change("resumeFacts", e.target.value)}
                className={`${accountField} mt-2 resize-y`}
                placeholder="عنوان فعالیت، مجموعه یا محل تحصیل، زمان و دستاورد واقعی…"
              />
            </label>
          </WorkspaceSection>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
            <p role="status" className="text-xs text-slate-500">
              {saved
                ? "تغییرات پروفایل ذخیره شد."
                : "اطلاعاتت را می‌توانی هر زمان ویرایش کنی."}
            </p>
            <Button type="submit" loading={loading} disabled={fetching}>
              {loading ? "در حال ذخیره…" : saved ? "ذخیره شد" : "ذخیره پروفایل"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
