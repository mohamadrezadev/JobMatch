import type { Skill } from "./user";

export interface JobSkillRef {
  name: string;
  weight?: number;
}

export interface Job {
  match?: MatchResult;
  id: string;
  title: string;
  company: string;
  location: string | null;
  workType: "Remote" | "OnSite" | "Hybrid" | null;
  experienceLevel: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  description: string | null;
  requiredSkills: JobSkillRef[] | Skill[];
  preferredSkills?: JobSkillRef[] | Skill[];
  source: string;
  sourceUrl?: string | null;
  postedAt: string | null;
  currency?: "TOMAN" | null;
  salaryPeriod?: "MONTHLY" | null;
}

export interface MatchResult {
  matchScore: number | null;
  status?: "ready" | "partial" | "insufficient_data";
  reason?:
    "RESUME_REQUIRED" | "PROFILE_REQUIRED" | "JOB_REQUIREMENTS_UNKNOWN" | null;
  evidenceCoverage?: number;
  breakdown: {
    skills: { score: number | null; matched: string[]; missing: string[] };
    experience: { score: number | null; details: string };
    location: { score: number | null; details: string };
    workType?: { score: number | null; details: string; status?: string };
    salary: { score: number | null; details: string };
  };
  skillGaps: string[];
  explanation?: string;
}
