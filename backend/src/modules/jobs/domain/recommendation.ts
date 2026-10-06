import { normalize, skillRefs } from "../../matching/domain/match";
interface FeedbackJob {
  requiredSkills: unknown;
  location: string | null;
  workType: string | null;
  company: string;
  experienceLevel: string | null;
  salaryMin?: number | null;
  currency?: string | null;
  salaryPeriod?: string | null;
}
export interface RankFeedback {
  jobId: string;
  rating: string;
  reason: string | null;
  job: FeedbackJob;
}
export function feedbackModifier(
  job: FeedbackJob,
  feedback: RankFeedback[],
): number {
  // Inputs are newest first: repeated clicks never satisfy the threshold.
  const latest = [
    ...new Map([...feedback].reverse().map((f) => [f.jobId, f])).values(),
  ];
  if (latest.length < 3) return 0;
  const names = new Set(
    skillRefs(job.requiredSkills).map((s) => normalize(s.name)),
  );
  let modifier = 0;
  for (const f of latest) {
    const overlap = skillRefs(f.job.requiredSkills).some((s) =>
      names.has(normalize(s.name)),
    );
    if (f.rating === "Interested" && overlap) modifier += 0.1;
    if (f.rating !== "NotInterested") continue;
    if (
      (f.reason === "Technology" && overlap) ||
      (f.reason === "Location" &&
        job.location != null &&
        job.location === f.job.location) ||
      (f.reason === "JobType" &&
        job.workType != null &&
        job.workType === f.job.workType) ||
      (f.reason === "ExperienceLevel" &&
        job.experienceLevel != null &&
        job.experienceLevel === f.job.experienceLevel) ||
      (f.reason === "NotInterestedInCompany" &&
        job.company === f.job.company) ||
      (f.reason === "Salary" &&
        job.salaryMin != null &&
        f.job.salaryMin != null &&
        job.currency === "TOMAN" &&
        f.job.currency === "TOMAN" &&
        job.salaryPeriod === "MONTHLY" &&
        f.job.salaryPeriod === "MONTHLY" &&
        job.salaryMin <= f.job.salaryMin)
    )
      modifier -= 0.05;
  }
  return Math.max(-0.15, Math.min(0.15, modifier));
}
