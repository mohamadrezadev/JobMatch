export interface MatchJob {
  requiredSkills: unknown;
  preferredSkills?: unknown;
  experienceLevel: string | null;
  location: string | null;
  workType: string | null;
  salaryMin?: number | null;
  currency?: string | null;
  salaryPeriod?: string | null;
}
export interface MatchProfile {
  experienceYears?: number | null;
  experienceLevel?: string | null;
  location?: string | null;
  workType?: string | null;
  desiredSalary?: number | null;
}
export const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک");
export function skillRefs(value: unknown): { name: string; weight?: number }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is { name: string; weight?: number } =>
      entry !== null &&
      typeof entry === "object" &&
      typeof entry.name === "string",
  );
}
const component = (
  score: number | null,
  details: string,
  status: "known" | "unknown" = "known",
) => ({ score, details, status });
export function matchJob(
  profile: MatchProfile | null,
  skills: string[],
  job: MatchJob,
  hasResume = false,
) {
  const names = new Set(skills.map(normalize));
  const required = skillRefs(job.requiredSkills);
  const preferred = skillRefs(job.preferredSkills);
  const refs = [
    ...required.map((s) => ({
      name: s.name,
      weight: s.weight && s.weight > 0 ? s.weight : 2,
    })),
    ...preferred
      .filter(
        (s) => !required.some((r) => normalize(r.name) === normalize(s.name)),
      )
      .map((s) => ({ name: s.name, weight: 1 })),
  ];
  const matched = refs.filter((s) => names.has(normalize(s.name)));
  const missing = required.filter((s) => !names.has(normalize(s.name)));
  const total = refs.reduce((sum, s) => sum + s.weight, 0);
  const skillScore = total
    ? Math.round((100 * matched.reduce((sum, s) => sum + s.weight, 0)) / total)
    : null;
  const levels: Record<string, number> = { junior: 0, mid: 2, senior: 5 };
  const level = job.experienceLevel ? normalize(job.experienceLevel) : "";
  const numeric = /^\d+(?:\.\d+)?(?:\s*(?:سال|years?|\+))?$/.test(level)
    ? parseFloat(level)
    : undefined;
  const years = numeric ?? levels[level];
  const userYears =
    profile?.experienceYears ??
    (profile?.experienceLevel
      ? levels[normalize(profile.experienceLevel)]
      : undefined);
  const experience =
    years != null && userYears != null
      ? component(
          years === 0 || userYears >= years
            ? 100
            : Math.round((100 * userYears) / years),
          `${userYears} سال سابقه؛ نیاز آگهی ${years} سال`,
        )
      : component(null, "سابقه موردنیاز یا سابقه شما مشخص نیست.", "unknown");
  const city = (s: string) =>
    normalize(s) === "tehran" ? "تهران" : normalize(s);
  const location =
    job.workType === "Remote"
      ? component(100, "موقعیت دورکار محدودیت شهری ندارد.")
      : profile?.location && job.location
        ? component(
            city(profile.location) === city(job.location) ? 100 : 0,
            city(profile.location) === city(job.location)
              ? "شهر با ترجیح شما منطبق است."
              : "شهر با ترجیح شما متفاوت است.",
          )
        : component(null, "شهر مشخص نیست.", "unknown");
  const workType =
    profile?.workType && job.workType
      ? component(
          profile.workType === job.workType ? 100 : 0,
          profile.workType === job.workType
            ? "نوع همکاری با ترجیح شما منطبق است."
            : "نوع همکاری با ترجیح شما متفاوت است.",
        )
      : component(null, "نوع همکاری مشخص نیست.", "unknown");
  const salary = !profile?.desiredSalary
    ? component(null, "حداقل حقوق شما مشخص نیست.", "unknown")
    : job.salaryMin == null ||
        job.currency !== "TOMAN" ||
        job.salaryPeriod !== "MONTHLY"
      ? component(null, "حقوق ماهانه قابل مقایسه اعلام نشده است.", "unknown")
      : component(
          Math.min(
            100,
            Math.round((job.salaryMin / profile.desiredSalary) * 100),
          ),
          job.salaryMin >= profile.desiredSalary
            ? "حداقل حقوق آگهی با انتظار شما منطبق است."
            : "حداقل حقوق آگهی کمتر از انتظار شماست.",
        );
  const breakdown = {
    skills: {
      score: names.size ? skillScore : null,
      matched: matched.map((s) => s.name),
      missing: missing.map((s) => s.name),
      status: total && names.size ? "known" : "unknown",
    },
    experience,
    location,
    workType,
    salary,
  };
  const reason = !hasResume
    ? "RESUME_REQUIRED"
    : !profile || !names.size || userYears == null
      ? "PROFILE_REQUIRED"
      : !total || years == null
        ? "JOB_REQUIREMENTS_UNKNOWN"
        : null;
  const components = [
    [breakdown.skills.score, 60],
    [experience.score, 20],
    [location.score, 5],
    [workType.score, 5],
    [salary.score, 10],
  ] as const;
  const known = components.filter(([score]) => score != null);
  const evidenceCoverage = known.reduce((sum, [, weight]) => sum + weight, 0);
  const matchScore =
    reason || !evidenceCoverage
      ? null
      : Math.round(
          known.reduce((sum, [score, weight]) => sum + score! * weight, 0) /
            evidenceCoverage,
        );
  const unavailable =
    reason === "RESUME_REQUIRED"
      ? "هنوز رزومه‌ای ذخیره نکرده‌اید؛ درصد تطابق محاسبه نشده است."
      : reason === "PROFILE_REQUIRED"
        ? "مهارت‌ها و سابقه واقعی خود را تکمیل کنید؛ اطلاعات کافی برای تطابق نداریم."
        : "نیازمندی‌های مهارت یا سابقه آگهی مشخص نیست؛ درصد قابل اتکایی نداریم.";
  return {
    matchScore,
    status: reason
      ? "insufficient_data"
      : evidenceCoverage < 100
        ? "partial"
        : "ready",
    reason,
    evidenceCoverage: reason ? 0 : evidenceCoverage,
    breakdown,
    skillGaps: reason ? [] : missing.map((s) => s.name),
    explanation: reason
      ? unavailable
      : `${matched.length} مهارت منطبق است. ${experience.details} ${location.details} ${workType.details} ${salary.details}`,
    weights: {
      skills: 60,
      experience: 20,
      location: 5,
      workType: 5,
      salary: 10,
    },
  };
}
