"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/api-client";
import type { UserSkill } from "@/types/user";
import { useAuthStore } from "@/stores/useAuthStore";

type ExperienceLevel = "Junior" | "Mid" | "Senior";
type WorkType = "Remote" | "OnSite" | "Hybrid";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [form, setForm] = useState({
    title: "",
    bio: "",
    location: "",
    desiredSalary: "",
    experienceYears: "",
    experienceLevel: "" as ExperienceLevel | "",
    workType: "" as WorkType | "",
    resumeFacts: "",
    firstName: "",
    lastName: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await apiClient.get("/api/users/profile");
      const p = res.data.data ?? res.data;
      setForm({
        title: p.title ?? "",
        bio: p.bio ?? "",
        location: p.location ?? "",
        desiredSalary: p.desiredSalary?.toString() ?? "",
        experienceYears: p.experienceYears?.toString() ?? "",
        experienceLevel: (p.experienceLevel ?? "") as ExperienceLevel,
        workType: (p.workType ?? "") as WorkType,
        resumeFacts: (p.resumeFacts ?? []).join("\n"),
        firstName: p.user?.firstName ?? "",
        lastName: p.user?.lastName ?? "",
      });
      const skillResponse = await apiClient.get("/api/users/skills");
      setSkills(skillResponse.data.data ?? skillResponse.data);
    } catch {
      setError("دریافت پروفایل انجام نشد.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiClient.put("/api/users/profile", {
        ...form,
        resumeFacts: form.resumeFacts
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        experienceLevel: form.experienceLevel || undefined,
        workType: form.workType || undefined,
        desiredSalary: form.desiredSalary
          ? Number(form.desiredSalary)
          : undefined,
        experienceYears: form.experienceYears
          ? Number(form.experienceYears)
          : undefined,
      });
      setSaved(true);
      const user = useAuthStore.getState().user;
      if (user)
        useAuthStore.setState({
          user: { ...user, firstName: form.firstName, lastName: form.lastName },
        });
      setTimeout(() => setSaved(false), 2000);
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
      setSkills((rows) => rows.filter((row) => row.skill.id !== skillId));
    } catch {
      setError("حذف مهارت انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
        پروفایل
      </h1>
      <Card>
        {error && (
          <p role="alert" className="text-rose-500">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="نام"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <Input
              label="نام خانوادگی"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="نقش شغلی / Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="مکان"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="سال‌های سابقه"
              type="number"
              min="0"
              max="50"
              value={form.experienceYears}
              onChange={(e) =>
                setForm({ ...form, experienceYears: e.target.value })
              }
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                سطح تجربه
              </label>
              <select
                value={form.experienceLevel}
                onChange={(e) =>
                  setForm({
                    ...form,
                    experienceLevel: e.target.value as ExperienceLevel,
                  })
                }
                className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              >
                <option value="">انتخاب کنید…</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="حقوق ماهانه موردنظر"
              type="number"
              value={form.desiredSalary}
              onChange={(e) =>
                setForm({ ...form, desiredSalary: e.target.value })
              }
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                نوع همکاری
              </label>
              <select
                value={form.workType}
                onChange={(e) =>
                  setForm({ ...form, workType: e.target.value as WorkType })
                }
                className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              >
                <option value="">انتخاب کنید…</option>
                <option value="Remote">Remote</option>
                <option value="OnSite">On-site</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              درباره من
            </label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
              placeholder="درباره خودتان برای کارفرما بنویسید…"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "در حال ذخیره…" : saved ? "ذخیره شد" : "ذخیره پروفایل"}
          </Button>
          <label className="block text-sm">
            سوابق، پروژه‌ها و تحصیلات واقعی شما (هر مورد در یک خط)
            <textarea
              aria-label="اطلاعات واقعی رزومه"
              rows={5}
              value={form.resumeFacts}
              onChange={(e) =>
                setForm({ ...form, resumeFacts: e.target.value })
              }
              className="mt-2 w-full rounded-xl border p-3 dark:bg-dark-card"
            />
          </label>
        </form>
        <div className="mt-6 space-y-3">
          <h2 className="font-bold">مهارت‌های ثبت‌شده</h2>
          <div className="flex gap-2">
            <Input
              label="مهارت جدید"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
            />
            <Button disabled={loading || !newSkill.trim()} onClick={addSkill}>
              افزودن مهارت
            </Button>
          </div>
          {skills.map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <span>{entry.skill.name}</span>
              <button
                disabled={loading}
                onClick={() => removeSkill(entry.skill.id)}
                aria-label={`حذف مهارت ${entry.skill.name}`}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
