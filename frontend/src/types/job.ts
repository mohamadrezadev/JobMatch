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
  matchScore: number;
  breakdown: {
    skills: { score: number; matched: string[]; missing: string[] };
    experience: { score: number; details: string };
    location: { score: number; details: string };
    workType?: { score: number; details: string; status?: string };
    salary: { score: number; details: string };
  };
  skillGaps: string[];
  explanation?: string;
}
