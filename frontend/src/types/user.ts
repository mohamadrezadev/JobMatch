export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  createdAt: string;
}

export interface Profile {
  userId: string;
  title?: string | null;
  bio?: string | null;
  location?: string | null;
  desiredSalary?: number | null;
  experienceYears?: number | null;
  experienceLevel?: "Junior" | "Mid" | "Senior" | null;
  workType?: "Remote" | "OnSite" | "Hybrid" | null;
  socialLinks?: Record<string, string>;
  isProfileComplete: boolean;
  resumeFacts?: string[];
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  category: "Programming" | "Framework" | "Tool" | "Soft";
}

export interface UserSkill {
  id: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  yearsOfExperience?: number;
  skill: Skill;
}
