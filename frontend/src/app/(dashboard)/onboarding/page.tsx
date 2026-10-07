"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageLoading, LoadingState } from "@/components/ui/LoadingState";
import apiClient from "@/lib/api-client";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, markProfileComplete } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);

  // Step 1: Basic info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [targetRole, setTargetRole] = useState("");

  // Step 2: Experience
  const [experienceYears, setExperienceYears] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<
    "Junior" | "Mid" | "Senior"
  >("Junior");

  // Step 3: Skills
  const [newSkill, setNewSkill] = useState("");
  const [skills, setSkills] = useState<{ name: string; level: string }[]>([]);
  const [skillLevel, setSkillLevel] = useState("Intermediate");

  // Step 4: Preferences
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState<"Remote" | "OnSite" | "Hybrid">(
    "Remote",
  );
  const [desiredSalary, setDesiredSalary] = useState("");

  useEffect(() => {
    const user = useAuthStore.getState().user;
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    const key = `onboarding-draft-${user?.id}`;
    try {
      const draft = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (draft) {
        setStep(draft.step);
        setFirstName(draft.firstName);
        setLastName(draft.lastName);
        setTargetRole(draft.targetRole);
        setExperienceYears(draft.experienceYears);
        setExperienceLevel(draft.experienceLevel);
        setSkills(draft.skills);
        setLocation(draft.location);
        setWorkType(draft.workType);
        setDesiredSalary(draft.desiredSalary);
      }
    } catch {}
    setDraftReady(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!draftReady) return;
    sessionStorage.setItem(
      `onboarding-draft-${useAuthStore.getState().user?.id}`,
      JSON.stringify({
        step,
        firstName,
        lastName,
        targetRole,
        experienceYears,
        experienceLevel,
        skills,
        location,
        workType,
        desiredSalary,
      }),
    );
  }, [
    draftReady,
    step,
    firstName,
    lastName,
    targetRole,
    experienceYears,
    experienceLevel,
    skills,
    location,
    workType,
    desiredSalary,
  ]);

  function saveProgress(currentStep: Step) {
    completeOnboarding(currentStep);
    setStep(currentStep);
  }

  async function nextStep() {
    if (step === 1 && targetRole) saveProgress(2);
    else if (step === 2 && experienceYears) saveProgress(3);
    else if (step === 3 && skills.length > 0) saveProgress(4);
    else if (step === 4) await submitProfile();
  }

  async function submitProfile() {
    setSaving(true);
    setError("");
    try {
      const response = await apiClient.post("/api/onboarding/complete", {
        firstName,
        lastName,
        skills,
        title: targetRole,
        location,
        experienceYears: Number(experienceYears),
        experienceLevel,
        workType,
        desiredSalary: desiredSalary ? Number(desiredSalary) : undefined,
      });
      const saved = response.data.data ?? response.data;
      useAuthStore.setState({ user: saved.user });
      markProfileComplete();
      sessionStorage.removeItem(`onboarding-draft-${saved.user.id}`);
      router.push("/chat");
    } catch {
      setError("ذخیره اطلاعات انجام نشد. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  function addSkill() {
    if (!newSkill.trim()) return;
    setSkills([...skills, { name: newSkill.trim(), level: skillLevel }]);
    setNewSkill("");
  }

  const stepsLabel = ["اطلاعات پایه", "تجربه", "مهارت‌ها", "ترجیحات"];

  if (!draftReady)
    return (
      <PageLoading
        title="در حال آماده‌کردن پروفایل…"
        description="اطلاعاتی که قبلاً وارد کرده‌ای را آماده می‌کنیم."
        layout="form"
      />
    );
  return (
    <div className="mx-auto max-w-xl space-y-6">
      {saving && (
        <LoadingState
          title="در حال ذخیره پروفایل…"
          description="اطلاعات و ترجیحاتت را ثبت می‌کنیم."
          compact
        />
      )}
      {error && (
        <p role="alert" className="text-rose-500">
          {error}
        </p>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          پروفایل خود را تکمیل کنید
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          این اطلاعات به پیشنهاد فرصت‌های مناسب کمک می‌کند.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {stepsLabel.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? "bg-brand-600" : "bg-slate-200 dark:bg-dark-border"}`}
          />
        ))}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Step {step} of 4 — {stepsLabel[step - 1]}
      </p>

      {step === 1 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">
              اطلاعات پایه
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="نام"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="نام خانوادگی"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <Input
              label="نقش شغلی"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., Junior .NET Developer"
            />
            <Button
              className="w-full"
              onClick={nextStep}
              disabled={
                !targetRole.trim() || !firstName.trim() || !lastName.trim()
              }
            >
              ادامه
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">
              تجربه
            </h2>
            <Input
              label="سال‌های سابقه"
              type="number"
              min="0"
              max="50"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                سطح
              </label>
              <div className="flex gap-2">
                {(["Junior", "Mid", "Senior"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setExperienceLevel(lvl)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium ${experienceLevel === lvl ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card"}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={nextStep}
              disabled={!experienceYears}
            >
              ادامه
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">
              مهارت‌های شما
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              فناوری‌ها و ابزارهایی را که می‌دانید اضافه کنید.
            </p>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g., C#"
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
              />
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-dark-border px-2 py-2 text-sm"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
              <Button onClick={addSkill} size="sm">
                افزودن
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((sk, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-sm text-brand-700"
                >
                  {sk.name}
                  <span className="text-xs opacity-70">({sk.level})</span>
                  <button
                    onClick={() =>
                      setSkills(skills.filter((_, idx) => idx !== i))
                    }
                    className="ml-1 text-brand-400 hover:text-brand-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={nextStep}
              disabled={skills.length === 0}
            >
              ادامه
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">
              ترجیحات
            </h2>
            <Input
              label="مکان ترجیحی"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Tehran or Remote"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                نوع همکاری
              </label>
              <div className="flex gap-2">
                {(["Remote", "Hybrid", "OnSite"] as const).map((wt) => (
                  <button
                    key={wt}
                    onClick={() => setWorkType(wt)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium ${workType === wt ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-card"}`}
                  >
                    {wt}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="حداقل حقوق ماهانه (اختیاری)"
              type="number"
              value={desiredSalary}
              onChange={(e) => setDesiredSalary(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={nextStep}
              loading={saving}
              disabled={!location.trim()}
            >
              {saving ? "در حال ذخیره…" : "ذخیره و کشف فرصت‌ها"}
            </Button>
          </div>
        </Card>
      )}

      {step > 1 && (
        <button
          onClick={() => setStep((step - 1) as Step)}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
        >
          بازگشت
        </button>
      )}
    </div>
  );
}
