import { JobSearchIntent } from "../../chat/domain/conversation";

export const INITIAL_SOURCES = [
  "jobvision.ir",
  "jobinja.ir",
  "irantalent.com",
  "e-estekhdam.com",
];
export interface DiscoveredJob {
  title: string;
  company: string;
  location: string | null;
  workType: "Remote" | "Hybrid" | "OnSite" | null;
  experienceLevel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: "TOMAN" | null;
  salaryPeriod: "MONTHLY" | null;
  description: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  source: string;
  sourceUrl: string;
  publishedAt: string | null;
}
export interface DiscoveryJob extends DiscoveredJob {
  id: string;
  warnings: string[];
}
export interface SourceReport {
  source: string;
  query: string;
  found: number;
  accepted: number;
  rejected: number;
  evaluated?: number;
  error?: string;
}
export interface DiscoveryResult {
  runId: string;
  jobs: DiscoveryJob[];
  partial: boolean;
  sources: SourceReport[];
  cached?: boolean;
  code?: "NO_JOBS_FOUND";
}
export class DiscoveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}
export function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
export function canonicalUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString();
}
export function queryFor(source: string, intent: JobSearchIntent) {
  const safe = (value: string) =>
    value
      .replace(/[\r\n"<>]/g, " ")
      .replace(/(?:site|inurl|intitle):\S*/gi, "")
      .slice(0, 100);
  const work = intent.workTypes?.map(
    (value) =>
      ({ Remote: "دورکاری Remote", Hybrid: "هیبرید Hybrid", OnSite: "حضوری" })[
        value
      ],
  );
  // Preferred skills rank results later; do not make them mandatory search terms.
  return `site:${source} ${intent.targetRoles.map(safe).join(" OR ")} ${(intent.requiredSkills ?? []).map(safe).join(" ")} استخدام ${(work ?? []).join(" OR ")} ${(intent.locations ?? []).map(safe).join(" ")}`.trim();
}
export function normalizedExperience(value: string | null | undefined) {
  const text = normalizeText(value ?? "");
  if (/\bjunior\b|جونیور/.test(text)) return "Junior";
  if (/\bsenior\b|سینیور|ارشد/.test(text)) return "Senior";
  if (/\bmid(?:[ -]?level)?\b|میدلول|میانی/.test(text)) return "Mid";
  return null;
}
export function salaryConfirmed(job: DiscoveredJob, intent: JobSearchIntent) {
  return (
    intent.minimumSalary == null ||
    (job.currency === "TOMAN" &&
      job.salaryPeriod === "MONTHLY" &&
      job.salaryMin != null &&
      job.salaryMin >= intent.minimumSalary)
  );
}
export function filterAndRank(
  jobs: DiscoveredJob[],
  intent: JobSearchIntent,
  rankingExperienceLevel?: string,
) {
  // Existing conversation JSON can predate requiredSkills. Preserve the same
  // conjunction for those stored Backend/.NET requests without a DB migration.
  const compoundDotnet =
    intent.targetRoles.includes(".NET Developer") &&
    intent.targetRoles.some((role) =>
      [
        "Backend Developer",
        "Frontend Developer",
        "Full Stack Developer",
      ].includes(role),
    );
  const targetRoles = compoundDotnet
    ? intent.targetRoles.filter((role) => role !== ".NET Developer")
    : intent.targetRoles;
  const requiredSkills = [
    ...(intent.requiredSkills ?? []),
    ...(compoundDotnet ? [".NET"] : []),
  ];
  const aliases: Record<string, string[]> = {
    حسابدار: ["حسابدار", "accountant", "accounting"],
    حسابداری: ["حسابدار", "accountant", "accounting"],
    accountant: ["حسابدار", "accountant"],
    "backend developer": ["backend", "back-end", "بک اند", "بک‌اند", "بکاند"],
    "frontend developer": ["frontend", "front-end", "فرانت"],
    "node.js developer": ["node.js", "nodejs", "node js", "نود"],
    "react developer": ["react", "ری اکت", "ری‌اکت"],
    "python developer": ["python", "پایتون"],
    ".net developer": [
      ".net",
      "dotnet",
      "dot net",
      "دات نت",
      "دات‌نت",
      "سی شارپ",
      "c#",
    ],
  };
  const has = (text: string, term: string) =>
    normalizeText(text).includes(normalizeText(term));
  const matchesTitle = (title: string, role: string) => {
    const known = aliases[normalizeText(role)];
    if (known) return known.some((term) => has(title, term));
    // Open titles need all their words, allowing punctuation/word order in an
    // actual posting without accepting a different job with one shared word.
    const words = (value: string) =>
      normalizeText(value)
        .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
        .split(/\s+/)
        .filter(Boolean)
        // Users name the occupation; postings may use the person/job title.
        .map((word) => (word === "حسابداری" ? "حسابدار" : word));
    const terms = words(role);
    const actual = new Set(words(title));
    return terms.length > 0 && terms.every((term) => actual.has(term));
  };
  return jobs
    .filter((job) => {
      if (!targetRoles.some((role) => matchesTitle(job.title, role)))
        return false;
      if (
        intent.workTypes?.length &&
        (!job.workType || !intent.workTypes.includes(job.workType))
      )
        return false;
      if (
        intent.locations?.length &&
        !(job.workType === "Remote" && !job.location) &&
        (!job.location ||
          !intent.locations.some(
            (location) =>
              has(job.location!, location) ||
              (location === "Tehran" && has(job.location!, "تهران")),
          ))
      )
        return false;
      if (
        intent.excludedCompanies?.some((company) => has(job.company, company))
      )
        return false;
      const requirements = [job.title, ...job.requiredSkills].join(" ");
      const technologyEvidence = [requirements, ...job.preferredSkills].join(
        " ",
      );
      if (
        requiredSkills.some(
          (skill) =>
            !(skill === ".NET" ? aliases[".net developer"] : [skill]).some(
              (term) => has(technologyEvidence, term),
            ),
        )
      )
        return false;
      if (
        intent.experienceLevel &&
        (!normalizedExperience(intent.experienceLevel) ||
          normalizedExperience(job.experienceLevel) !==
            normalizedExperience(intent.experienceLevel))
      )
        return false;
      if (intent.excludedSkills?.some((skill) => has(requirements, skill)))
        return false;
      // A range must guarantee the requested minimum. Unknown salaries remain visible with a warning.
      if (
        intent.minimumSalary != null &&
        job.currency === "TOMAN" &&
        job.salaryPeriod === "MONTHLY" &&
        job.salaryMin != null &&
        job.salaryMin < intent.minimumSalary
      )
        return false;
      if (
        intent.minimumSalary != null &&
        job.currency === "TOMAN" &&
        job.salaryPeriod === "MONTHLY" &&
        job.salaryMin == null &&
        job.salaryMax != null &&
        job.salaryMax < intent.minimumSalary
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      const score = (job: DiscoveredJob) =>
        (!intent.experienceLevel &&
        rankingExperienceLevel &&
        normalizedExperience(job.experienceLevel) ===
          normalizedExperience(rankingExperienceLevel)
          ? 1
          : 0) +
        (intent.preferredSkills ?? []).filter((skill) =>
          has(
            [job.title, ...job.requiredSkills, ...job.preferredSkills].join(
              " ",
            ),
            skill,
          ),
        ).length;
      return score(b) - score(a);
    });
}
export function deduplicate(jobs: DiscoveredJob[]) {
  const urls = new Set<string>(),
    identities = new Set<string>();
  return jobs.filter((job) => {
    const url = canonicalUrl(job.sourceUrl);
    const identity = [job.company, job.title, job.location ?? ""]
      .map(normalizeText)
      .join("|");
    if (urls.has(url) || identities.has(identity)) return false;
    urls.add(url);
    identities.add(identity);
    job.sourceUrl = url;
    return true;
  });
}
