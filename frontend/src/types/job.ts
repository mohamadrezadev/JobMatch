import type { Skill } from './user';

export interface JobSkillRef {
  name: string;
  weight?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workType: 'Remote' | 'OnSite' | 'Hybrid';
  experienceLevel: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  description: string;
  requiredSkills: JobSkillRef[] | Skill[];
  preferredSkills?: JobSkillRef[] | Skill[];
  source: string;
  sourceUrl?: string | null;
  postedAt: string;
}

export interface MatchResult {
  matchScore: number;
  breakdown: {
    skills: { score: number; matched: string[]; missing: string[] };
    experience: { score: number; details: string };
    location: { score: number; details: string };
    salary: { score: number; details: string };
  };
  skillGaps: string[];
  explanation?: string;
}
