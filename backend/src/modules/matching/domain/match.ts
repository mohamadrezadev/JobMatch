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
  score: number,
  details: string,
  status: "known" | "unknown" = "known",
) => ({ score, details, status });
export function matchJob(
  profile: MatchProfile | null,
  skills: string[],
  job: MatchJob,
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
    : 50;
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
      : component(50, "سابقه موردنیاز یا سابقه شما مشخص نیست.", "unknown");
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
        : component(50, "شهر مشخص نیست.", "unknown");
  const workType =
    profile?.workType && job.workType
      ? component(
          profile.workType === job.workType ? 100 : 0,
          profile.workType === job.workType
            ? "نوع همکاری با ترجیح شما منطبق است."
            : "نوع همکاری با ترجیح شما متفاوت است.",
        )
      : component(50, "نوع همکاری مشخص نیست.", "unknown");
  const salary = !profile?.desiredSalary
    ? component(50, "حداقل حقوق شما مشخص نیست.", "unknown")
    : job.salaryMin == null ||
        job.currency !== "TOMAN" ||
        job.salaryPeriod !== "MONTHLY"
      ? component(50, "حقوق ماهانه قابل مقایسه اعلام نشده است.", "unknown")
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
      score: skillScore,
      matched: matched.map((s) => s.name),
      missing: missing.map((s) => s.name),
      status: total ? "known" : "unknown",
    },
    experience,
    location,
    workType,
    salary,
  };
  const matchScore = Math.round(
    skillScore * 0.6 +
      experience.score * 0.2 +
      location.score * 0.05 +
      workType.score * 0.05 +
      salary.score * 0.1,
  );
  return {
    matchScore,
    breakdown,
    skillGaps: missing.map((s) => s.name),
    explanation: `${matched.length} مهارت منطبق است. ${experience.details} ${location.details} ${workType.details} ${salary.details}`,
    weights: {
      skills: 60,
      experience: 20,
      location: 5,
      workType: 5,
      salary: 10,
    },
  };
}
